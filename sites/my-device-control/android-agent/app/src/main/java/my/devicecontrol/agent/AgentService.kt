package my.devicecontrol.agent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FieldValue
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.concurrent.ConcurrentHashMap

/**
 * Perkhidmatan latar depan (notifikasi sentiasa kelihatan: peranti ini diurus pentadbir):
 *  - heartbeat setiap 4 minit
 *  - mendengar arahan PENDING/SENT untuk peranti ini dan melaksanakannya
 */
class AgentService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var registration: ListenerRegistration? = null
    private var selfReg: ListenerRegistration? = null
    @Volatile private var released = false
    private val busy = ConcurrentHashMap.newKeySet<String>()
    private lateinit var repo: Repo
    private lateinit var executor: CommandExecutor

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        repo = Repo(applicationContext)
        executor = CommandExecutor(applicationContext)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        if (registration == null) startWork()
        return START_STICKY
    }

    private fun startInForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26)
            nm.createNotificationChannel(NotificationChannel("agent", "Pengurusan peranti", NotificationManager.IMPORTANCE_LOW))
        val n = NotificationCompat.Builder(this, "agent")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("MY DEVICE CONTROL")
            .setContentText("Peranti ini diurus oleh pentadbir.")
            .setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        else startForeground(1, n)
    }

    private fun startWork() {
        scope.launch {
            var uid: String? = null
            while (uid == null && isActive) {
                uid = runCatching { repo.ensureSignedIn() }.getOrNull()
                if (uid == null) delay(30_000)
            }
            val id = uid ?: return@launch
            executor.protect()
            if (Prefs.locked(applicationContext) && executor.isOwner()) executor.showKioskLock()
            listenCommands(id)
            listenSelf(id)
            while (isActive) {
                runCatching { repo.heartbeat(Prefs.locked(applicationContext), executor.isAdminActive()) }
                delay(AgentConfig.HEARTBEAT_MS)
            }
        }
    }

    /** Jika rekod peranti dipadam oleh admin, peranti ini dilepaskan dari kawalan. */
    private fun listenSelf(uid: String) {
        selfReg = FirebaseFirestore.getInstance().collection("devices").document(uid).addSnapshotListener { snap, e ->
            if (e != null) {
                if (e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) scope.launch { releaseDevice() }
                return@addSnapshotListener
            }
            if (snap != null && !snap.exists() && !snap.metadata.isFromCache) scope.launch { releaseDevice() }
        }
    }

    private fun releaseDevice() {
        if (released) return
        released = true
        registration?.remove(); registration = null; selfReg?.remove(); selfReg = null
        executor.release()
        Prefs.setEnrolled(applicationContext, false)
        FirebaseAuth.getInstance().signOut()
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(2, NotificationCompat.Builder(this, "agent").setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("MY DEVICE CONTROL").setContentText("Peranti ini tidak lagi diurus oleh pentadbir.").build())
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun listenCommands(uid: String) {
        registration = FirebaseFirestore.getInstance().collection("commands")
            .whereEqualTo("deviceId", uid).whereIn("status", listOf("PENDING", "SENT"))
            .addSnapshotListener { snap, e ->
                if (e != null || snap == null) return@addSnapshotListener
                for (d in snap.documents) {
                    val exp = d.getTimestamp("expiresAt")
                    if (exp != null && exp.toDate().time < System.currentTimeMillis()) continue
                    if (!busy.add(d.id)) continue
                    scope.launch {
                        try { handle(d.reference, d.getString("status") ?: "", d.getString("commandType") ?: "") }
                        finally { busy.remove(d.id) }
                    }
                }
            }
    }

    /** PENDING -> SENT -> (laksana) -> EXECUTED / FAILED. EXECUTED hanya selepas pelaksanaan sebenar. */
    private suspend fun handle(ref: DocumentReference, status: String, type: String) {
        try {
            if (status == "PENDING")
                ref.update(mapOf("status" to "SENT", "sentAt" to FieldValue.serverTimestamp())).await()
            val (ok, msg) = executor.run(type)
            if (ok) ref.update(mapOf("status" to "EXECUTED", "executedAt" to FieldValue.serverTimestamp())).await()
            else ref.update(mapOf("status" to "FAILED", "errorMessage" to (msg ?: "Gagal").take(300))).await()
            runCatching {
                repo.log(if (ok) "COMMAND_EXECUTED" else "COMMAND_FAILED", if (ok) "$type berjaya" else "$type gagal: $msg")
                repo.heartbeat(Prefs.locked(applicationContext), executor.isAdminActive())
            }
            if (ok && type == "REBOOT") executor.reboot()
        } catch (_: Exception) { /* arahan kekal SENT/PENDING dan dicuba semula pada snapshot seterusnya */ }
    }

    override fun onDestroy() {
        registration?.remove(); registration = null; selfReg?.remove(); selfReg = null
        scope.cancel()
        super.onDestroy()
    }
}
