package my.devicecontrol.agent

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.tasks.await

/**
 * Semua tulisan ke Firestore mengikut firestore.rules:
 *  - daftar: devices/{uid} + enrollments/{kod}=USED + publicStatus/{uid} + log, dalam satu batch
 *  - heartbeat: devices/{uid} + publicStatus/{uid}
 */
class Repo(private val ctx: Context) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    val uid: String? get() = auth.currentUser?.uid

    suspend fun ensureSignedIn(): String {
        auth.currentUser?.let { return it.uid }
        return auth.signInAnonymously().await().user!!.uid
    }

    fun battery(): Int? {
        val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val v = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (v in 0..100) v else null
    }

    /** Telefon atau tablet (lebar skrin terkecil >= 600dp = tablet). Untuk paparan di panel sahaja. */
    private fun formFactor() = if (ctx.resources.configuration.smallestScreenWidthDp >= 600) "Tablet" else "Telefon"

    private fun osVersion() = "Android ${Build.VERSION.RELEASE}".take(40)

    /** Daftar dengan kod enrollment (token biasa). Nama, jenis dan kumpulan dibaca dari enrollment. */
    suspend fun enroll(code: String) {
        val id = try { ensureSignedIn() } catch (e: Exception) {
            val m = e.message ?: ""
            throw IllegalStateException(
                if (m.contains("ADMIN_ONLY", true) || m.contains("restricted to administrators", true))
                    "Pendaftaran peranti baharu ditutup di Firebase (sign-up dimatikan). Hubungi pentadbir."
                else "Tidak dapat menyambung ke Firebase: $m")
        }
        val snap = try {
            db.collection("enrollments").document(code).get().await()
        } catch (e: FirebaseFirestoreException) {
            throw IllegalStateException("Kod tidak sah, sudah digunakan atau telah tamat tempoh.")
        }
        if (!snap.exists()) throw IllegalStateException("Kod tidak sah, sudah digunakan atau telah tamat tempoh.")
        val name = snap.getString("deviceName") ?: throw IllegalStateException("Enrollment rosak (tiada nama peranti).")
        val type = snap.getString("deviceType") ?: "ANDROID"
        val groupId = snap.getString("groupId")
        val now = FieldValue.serverTimestamp()
        val bat = battery()
        val batch = db.batch()
        batch.set(db.collection("devices").document(id), hashMapOf<String, Any?>(
            "deviceId" to id, "deviceName" to name, "deviceType" to type,
            "deviceModel" to "${Build.MANUFACTURER} ${Build.MODEL} (${formFactor()})".take(80), "osVersion" to osVersion(),
            "status" to "ENROLLMENT_PENDING", "isLocked" to false, "enrollmentStatus" to "PENDING_APPROVAL",
            "assignedUserId" to null, "groupId" to groupId, "batteryLevel" to bat,
            "lastSeen" to now, "createdAt" to now, "updatedAt" to now,
            "enrollmentCode" to code, "appVersion" to AgentConfig.APP_VERSION
        ))
        batch.update(db.collection("enrollments").document(code),
            mapOf("status" to "USED", "deviceId" to id, "usedAt" to now))
        batch.set(db.collection("publicStatus").document(id), hashMapOf<String, Any?>(
            "deviceName" to name, "deviceType" to type, "status" to "ENROLLMENT_PENDING",
            "batteryLevel" to bat, "lastSeen" to now, "groupName" to null, "updatedAt" to now
        ))
        batch.set(db.collection("activityLogs").document(), logMap("DEVICE_REGISTERED", "Peranti mengimbas kod, menunggu kelulusan", id))
        try {
            batch.commit().await()
        } catch (e: FirebaseFirestoreException) {
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED)
                throw IllegalStateException("Kod enrollment tidak sah, sudah digunakan atau telah tamat tempoh.")
            throw e
        }
    }

    suspend fun heartbeat(locked: Boolean, policyStatus: String? = null) {
        val id = uid ?: return
        val now = FieldValue.serverTimestamp()
        val status = if (locked) "LOCKED" else "ONLINE"
        val bat = battery()
        val batch = db.batch()
        val dev = hashMapOf<String, Any?>(
            "status" to status, "isLocked" to locked, "batteryLevel" to bat, "osVersion" to osVersion(),
            "appVersion" to AgentConfig.APP_VERSION, "lastSeen" to now, "updatedAt" to now)
        if (policyStatus != null) dev["policyStatus"] = policyStatus.take(200)
        batch.update(db.collection("devices").document(id), dev)
        batch.update(db.collection("publicStatus").document(id), mapOf(
            "status" to status, "batteryLevel" to bat, "lastSeen" to now, "updatedAt" to now
        ))
        batch.commit().await()
    }

    /** Cap masa peristiwa kunci: adminLockAt / onlineAgainAt / selfLockAt (hanya medan ini + updatedAt). */
    suspend fun stamp(field: String) {
        val id = uid ?: return
        require(field in setOf("adminLockAt", "onlineAgainAt", "selfLockAt"))
        db.collection("devices").document(id).update(mapOf(field to FieldValue.serverTimestamp(), "updatedAt" to FieldValue.serverTimestamp())).await()
    }

    /** Senarai aplikasi yang boleh dibuka pengguna (ikon pelancar). Untuk papan pemuka admin. */
    suspend fun syncInstalledApps() {
        val id = uid ?: return
        val pm = ctx.packageManager
        val list = pm.queryIntentActivities(android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_LAUNCHER), 0)
            .distinctBy { it.activityInfo.packageName }.take(400)
        for (chunk in list.chunked(400)) {
            val batch = db.batch()
            for (ri in chunk) {
                val pkg = ri.activityInfo.packageName
                val ver = try { pm.getPackageInfo(pkg, 0).versionName } catch (_: Exception) { null }
                batch.set(db.collection("devices").document(id).collection("installedApps").document(pkg), hashMapOf<String, Any?>(
                    "packageName" to pkg, "label" to ri.loadLabel(pm).toString().take(80), "versionName" to ver?.take(40),
                    "updatedAt" to FieldValue.serverTimestamp()))
            }
            batch.commit().await()
        }
    }

    /** Aplikasi yang dibuka (nama pakej + masa sahaja). */
    suspend fun appEvents(events: List<AppEvent>) {
        val id = uid ?: return
        for (chunk in events.chunked(400)) {
            val batch = db.batch()
            for (e in chunk) batch.set(db.collection("devices").document(id).collection("appEvents").document(), hashMapOf<String, Any?>(
                "packageName" to e.pkg, "label" to e.label, "at" to com.google.firebase.Timestamp(java.util.Date(e.atMs))))
            batch.commit().await()
        }
    }

    suspend fun liveState(state: String) {
        val id = uid ?: return
        db.collection("liveSessions").document(id).update(mapOf("state" to state, "updatedAt" to FieldValue.serverTimestamp())).await()
    }

    suspend fun liveFrame(frame: String, w: Int, h: Int, seq: Long) {
        val id = uid ?: return
        db.collection("liveSessions").document(id).update(mapOf("state" to "ACTIVE", "frame" to frame, "seq" to seq, "width" to w, "height" to h,
            "updatedAt" to FieldValue.serverTimestamp())).await()
    }

    suspend fun log(type: String, message: String) {
        val id = uid ?: return
        db.collection("activityLogs").add(logMap(type, message, id)).await()
    }

    private fun logMap(type: String, message: String, id: String) = hashMapOf<String, Any?>(
        "type" to type, "message" to message.take(200), "actorId" to null, "deviceId" to id,
        "createdAt" to FieldValue.serverTimestamp()
    )
}
