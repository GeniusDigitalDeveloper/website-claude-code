package my.devicecontrol.agent

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import com.google.firebase.FirebaseApp
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
        val id = ensureSignedIn()
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

    suspend fun heartbeat(locked: Boolean, adminOk: Boolean = true) {
        val id = uid ?: return
        val now = FieldValue.serverTimestamp()
        val status = if (locked) "LOCKED" else if (!adminOk) "ERROR" else "ONLINE"   // ERROR = pentadbir peranti dinyahaktifkan
        val bat = battery()
        val batch = db.batch()
        batch.update(db.collection("devices").document(id), mapOf(
            "status" to status, "isLocked" to locked, "batteryLevel" to bat, "osVersion" to osVersion(),
            "appVersion" to AgentConfig.APP_VERSION, "lastSeen" to now, "updatedAt" to now
        ))
        batch.update(db.collection("publicStatus").document(id), mapOf(
            "status" to status, "batteryLevel" to bat, "lastSeen" to now, "updatedAt" to now
        ))
        batch.commit().await()
    }

    /**
     * Lepaskan peranti ini dengan e-mel + kata laluan SALAH SATU akaun admin (Firebase Authentication).
     * Log masuk melalui aplikasi Firebase kedua supaya identiti peranti tidak hilang jika kelayakan salah.
     */
    suspend fun adminRelease(email: String, password: String) {
        val id = uid ?: throw IllegalStateException("Peranti ini belum didaftarkan.")
        val app = FirebaseApp.initializeApp(ctx, FirebaseApp.getInstance().options, "release-" + System.currentTimeMillis())
        try {
            val vauth = FirebaseAuth.getInstance(app)
            val admin = try { vauth.signInWithEmailAndPassword(email, password).await().user }
            catch (e: Exception) { throw IllegalStateException("E-mel atau kata laluan salah.") }
            if (admin == null || admin.isAnonymous) throw IllegalStateException("Akaun tidak sah.")
            val vdb = FirebaseFirestore.getInstance(app)
            val batch = vdb.batch()
            batch.delete(vdb.collection("devices").document(id))
            batch.delete(vdb.collection("publicStatus").document(id))
            batch.set(vdb.collection("activityLogs").document(), hashMapOf<String, Any?>(
                "type" to "DEVICE_REMOVED", "message" to "Peranti dilepaskan pada peranti sendiri (disahkan: ${admin.email})".take(200),
                "actorId" to admin.uid, "deviceId" to id, "createdAt" to FieldValue.serverTimestamp()))
            batch.commit().await()
            vauth.signOut()
        } finally { app.delete() }
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
