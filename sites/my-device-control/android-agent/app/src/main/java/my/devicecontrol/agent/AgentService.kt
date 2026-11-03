package my.devicecontrol.agent

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.FieldValue
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
 * Perkhidmatan latar depan (notifikasi sentiasa kelihatan: peranti ini diurus pentadbir).
 *  1. Selepas imbas QR: menunggu admin menekan Sahkan (enrollmentStatus PENDING_APPROVAL -> ENROLLED)
 *  2. Selepas disahkan: heartbeat, arahan, polisi aplikasi/web, aktiviti aplikasi, permintaan pantau skrin
 *  3. Jika rekod peranti dipadam admin: melepaskan peranti dari kawalan
 */
class AgentService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val regs = mutableListOf<ListenerRegistration>()
    private var selfReg: ListenerRegistration? = null
    @Volatile private var released = false
    @Volatile private var working = false
    @Volatile private var myGroup: String? = null
    @Volatile private var apps: List<AppRule> = emptyList()
    @Volatile private var web: List<WebRule> = emptyList()
    private var lastReq: Long = 0
    private val busy = ConcurrentHashMap.newKeySet<String>()
    private lateinit var repo: Repo
    private lateinit var executor: CommandExecutor

    override fun onBind(intent: Intent?): IBinder? = null

    /** Dikesan bila pengguna buka kunci telefon sendiri (masuk PIN/corak) — status kembali ONLINE serta-merta. */
    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (!Prefs.locked(applicationContext)) return
            Prefs.setLocked(applicationContext, false)
            scope.launch { runCatching { repo.heartbeat(false, statusText()) } }
        }
    }

    override fun onCreate() {
        super.onCreate()
        repo = Repo(applicationContext)
        executor = CommandExecutor(applicationContext)
        PolicyStore.load(applicationContext)
        registerReceiver(unlockReceiver, IntentFilter(Intent.ACTION_USER_PRESENT))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground()
        if (selfReg == null) startWork()
        return START_STICKY
    }

    private fun startInForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(NotificationChannel("agent", "Pengurusan peranti", NotificationManager.IMPORTANCE_LOW))
            nm.createNotificationChannel(NotificationChannel("monitor", "Permintaan pantau skrin", NotificationManager.IMPORTANCE_HIGH))
        }
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
            listenSelf(uid ?: return@launch)
        }
    }

    /** Memerhati rekod peranti ini: disahkan (ENROLLED), kumpulan, atau dipadam/ditolak oleh admin. */
    private fun listenSelf(uid: String) {
        selfReg = FirebaseFirestore.getInstance().collection("devices").document(uid).addSnapshotListener { snap, e ->
            if (e != null) {
                if (e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED) scope.launch { releaseDevice() }
                return@addSnapshotListener
            }
            if (snap == null) return@addSnapshotListener
            if (!snap.exists()) { if (!snap.metadata.isFromCache) scope.launch { releaseDevice() }; return@addSnapshotListener }
            val g = snap.getString("groupId")
            val changed = g != myGroup; myGroup = g
            if (snap.getString("enrollmentStatus") == "ENROLLED") { activate(uid); if (changed) recompute() } else Prefs.setState(applicationContext, "PENDING")
        }
    }

    private fun activate(uid: String) {
        if (working) return
        working = true
        Prefs.setState(applicationContext, "ACTIVE")
        executor.protect()
        if (Prefs.locked(applicationContext) && executor.isOwner()) executor.showKioskLock()
        listenCommands(uid); listenPolicies(); listenLive(uid)
        scope.launch {
            runCatching { repo.syncInstalledApps() }
            var tick = 0
            while (isActive) {
                runCatching { repo.heartbeat(Prefs.locked(applicationContext), statusText()) }
                flushUsage()
                if (++tick % 90 == 0) runCatching { repo.syncInstalledApps() }   // kira-kira setiap 6 jam
                delay(AgentConfig.HEARTBEAT_MS)
            }
        }
        scope.launch { while (isActive) { delay(20_000); flushUsage() } }
    }

    private suspend fun flushUsage() {
        val batch = ArrayList<AppEvent>()
        while (batch.size < 100) { batch.add(UsageBuffer.queue.poll() ?: break) }
        if (batch.isNotEmpty()) runCatching { repo.appEvents(batch) }.onFailure { batch.forEach { UsageBuffer.add(it) } }
    }

    /** Status penguatkuasaan yang dipaparkan kepada admin. */
    private fun statusText(): String {
        val acc = if (GuardService.instance != null) "aktif" else "belum diaktifkan"
        val vpnNeeded = PolicyStore.blockDomains.isNotEmpty()
        val vpn = if (!vpnNeeded) "tiada peraturan" else if (DnsVpnService.running) "aktif" else "belum diaktifkan"
        return "Aksesibiliti (aplikasi, kunci): $acc; Tapisan web (VPN): $vpn"
    }

    // ---------------- Polisi aplikasi dan web ----------------
    private fun listenPolicies() {
        val db = FirebaseFirestore.getInstance()
        regs.add(db.collection("applications").addSnapshotListener { s, _ ->
            if (s == null) return@addSnapshotListener
            apps = s.documents.mapNotNull { d -> val p = d.getString("packageName") ?: return@mapNotNull null
                AppRule(p, d.getString("label") ?: p, d.getString("policy") ?: "ALLOW", d.getString("groupId")) }
            recompute()
        })
        regs.add(db.collection("webFilteringRules").addSnapshotListener { s, _ ->
            if (s == null) return@addSnapshotListener
            web = s.documents.mapNotNull { d -> val v = d.getString("value") ?: return@mapNotNull null
                WebRule(d.getString("type") ?: "DOMAIN", d.getString("action") ?: "BLOCK", v,
                    (d.get("domains") as? List<*>)?.filterIsInstance<String>() ?: emptyList(), d.getString("groupId")) }
            recompute()
        })
    }

    private fun recompute() {
        PolicyStore.update(applicationContext, myGroup, apps, web)
        val needVpn = PolicyStore.blockDomains.isNotEmpty()
        if (needVpn && VpnService.prepare(this) == null) startService(Intent(this, DnsVpnService::class.java))
        else if (!needVpn && DnsVpnService.running) startService(Intent(this, DnsVpnService::class.java).setAction("STOP"))
    }

    // ---------------- Pantau skrin: admin minta, pengguna ketuk untuk benarkan ----------------
    private fun listenLive(uid: String) {
        regs.add(FirebaseFirestore.getInstance().collection("liveSessions").document(uid).addSnapshotListener { s, _ ->
            if (s == null || !s.exists()) return@addSnapshotListener
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            when (s.getString("state")) {
                "REQUESTED" -> {
                    val at = s.getTimestamp("requestedAt")?.toDate()?.time ?: 0L
                    if (at == lastReq) return@addSnapshotListener
                    lastReq = at
                    val pi = PendingIntent.getActivity(this, 4, Intent(this, ConsentActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    nm.notify(4, NotificationCompat.Builder(this, "monitor").setSmallIcon(android.R.drawable.ic_menu_view)
                        .setContentTitle("Admin meminta untuk melihat skrin anda").setContentText("Ketuk untuk membenarkan. Anda boleh berhenti bila-bila masa.")
                        .setPriority(NotificationCompat.PRIORITY_HIGH).setContentIntent(pi).setAutoCancel(true).build())
                }
                "STOPPED" -> { nm.cancel(4); stopService(Intent(this, ScreenShareService::class.java)) }
            }
        })
    }

    private fun releaseDevice() {
        if (released) return
        released = true
        regs.forEach { it.remove() }; regs.clear(); selfReg?.remove(); selfReg = null
        executor.release()
        if (DnsVpnService.running) startService(Intent(this, DnsVpnService::class.java).setAction("STOP"))
        stopService(Intent(this, ScreenShareService::class.java))
        PolicyStore.update(applicationContext, null, emptyList(), emptyList())
        Prefs.setState(applicationContext, "NONE")
        FirebaseAuth.getInstance().signOut()
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(2, NotificationCompat.Builder(this, "agent").setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("MY DEVICE CONTROL").setContentText("Peranti ini tidak lagi diurus oleh pentadbir.").build())
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun listenCommands(uid: String) {
        regs.add(FirebaseFirestore.getInstance().collection("commands")
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
            })
    }

    /** PENDING -> SENT -> (laksana) -> EXECUTED / FAILED. EXECUTED hanya selepas pelaksanaan sebenar. */
    private suspend fun handle(ref: DocumentReference, status: String, type: String) {
        try {
            if (status == "PENDING")
                ref.update(mapOf("status" to "SENT", "sentAt" to FieldValue.serverTimestamp())).await()
            val (ok, msg) = executor.run(type)
            if (ok) ref.update(mapOf("status" to "EXECUTED", "executedAt" to FieldValue.serverTimestamp())).await()
            else ref.update(mapOf("status" to "FAILED", "errorMessage" to (msg ?: "Gagal").take(300))).await()
            if (!ok && type == "LOCK") notifyNeedSetup()
            runCatching {
                repo.log(if (ok) "COMMAND_EXECUTED" else "COMMAND_FAILED", if (ok) "$type berjaya" else "$type gagal: $msg")
                repo.heartbeat(Prefs.locked(applicationContext), statusText())
            }
            if (ok && type == "REBOOT") executor.reboot()
        } catch (_: Exception) { /* arahan kekal SENT/PENDING dan dicuba semula pada snapshot seterusnya */ }
    }

    /** Kunci skrin memerlukan kebenaran Aksesibiliti SEKALI pada peranti. */
    private fun notifyNeedSetup() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val pi = PendingIntent.getActivity(this, 3, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        nm.notify(3, NotificationCompat.Builder(this, "agent").setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setContentTitle("Langkah akhir diperlukan").setContentText("Ketuk untuk mengaktifkan kawalan aplikasi dan kunci skrin.")
            .setContentIntent(pi).setAutoCancel(true).build())
    }

    override fun onDestroy() {
        regs.forEach { it.remove() }; regs.clear(); selfReg?.remove(); selfReg = null
        try { unregisterReceiver(unlockReceiver) } catch (_: Exception) {}
        scope.cancel()
        super.onDestroy()
    }
}
