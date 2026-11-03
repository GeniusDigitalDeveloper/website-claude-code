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

    private fun osVersion() = "Android ${Build.VERSION.RELEASE}".take(40)

    suspend fun enroll(code: String, name: String, type: String) {
        val id = ensureSignedIn()
        val now = FieldValue.serverTimestamp()
        val bat = battery()
        val batch = db.batch()
        batch.set(db.collection("devices").document(id), hashMapOf<String, Any?>(
            "deviceId" to id, "deviceName" to name, "deviceType" to type,
            "deviceModel" to "${Build.MANUFACTURER} ${Build.MODEL}".take(80), "osVersion" to osVersion(),
            "status" to "ONLINE", "isLocked" to false, "enrollmentStatus" to "ENROLLED",
            "assignedUserId" to null, "groupId" to null, "batteryLevel" to bat,
            "lastSeen" to now, "createdAt" to now, "updatedAt" to now,
            "enrollmentCode" to code, "appVersion" to AgentConfig.APP_VERSION
        ))
        batch.update(db.collection("enrollments").document(code),
            mapOf("status" to "USED", "deviceId" to id, "usedAt" to now))
        batch.set(db.collection("publicStatus").document(id), hashMapOf<String, Any?>(
            "deviceName" to name, "deviceType" to type, "status" to "ONLINE",
            "batteryLevel" to bat, "lastSeen" to now, "groupName" to null, "updatedAt" to now
        ))
        batch.set(db.collection("activityLogs").document(), logMap("DEVICE_REGISTERED", "Peranti didaftarkan", id))
        try {
            batch.commit().await()
        } catch (e: FirebaseFirestoreException) {
            if (e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED)
                throw IllegalStateException("Kod enrollment tidak sah, sudah digunakan atau telah tamat tempoh.")
            throw e
        }
    }

    suspend fun heartbeat(locked: Boolean) {
        val id = uid ?: return
        val now = FieldValue.serverTimestamp()
        val status = if (locked) "LOCKED" else "ONLINE"
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

    suspend fun log(type: String, message: String) {
        val id = uid ?: return
        db.collection("activityLogs").add(logMap(type, message, id)).await()
    }

    private fun logMap(type: String, message: String, id: String) = hashMapOf<String, Any?>(
        "type" to type, "message" to message.take(200), "actorId" to null, "deviceId" to id,
        "createdAt" to FieldValue.serverTimestamp()
    )
}
