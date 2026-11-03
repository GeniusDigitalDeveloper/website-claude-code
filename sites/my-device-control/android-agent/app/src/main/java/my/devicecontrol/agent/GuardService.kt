package my.devicecontrol.agent

import android.accessibilityservice.AccessibilityService
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import java.util.concurrent.ConcurrentLinkedQueue

/** Satu rekod "aplikasi dibuka". Hanya nama pakej dan masa; kandungan skrin tidak dibaca. */
data class AppEvent(val pkg: String, val label: String, val atMs: Long)

object UsageBuffer {
    val queue = ConcurrentLinkedQueue<AppEvent>()
    fun add(e: AppEvent) { queue.add(e); while (queue.size > 300) queue.poll() }
}

/**
 * Perkhidmatan Aksesibiliti (diaktifkan sekali oleh pengguna di Tetapan). Ia hanya mendengar peristiwa tukar tetingkap
 * (nama pakej aplikasi di hadapan). Digunakan untuk: merekod aplikasi dibuka, menyekat aplikasi, dan mengunci skrin.
 */
class GuardService : AccessibilityService() {
    companion object {
        @Volatile var instance: GuardService? = null
        @Volatile private var last: String? = null
        fun resetLast() { last = null }
    }

    private val homePkgs by lazy {
        packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME), 0).map { it.activityInfo.packageName }.toSet()
    }

    override fun onServiceConnected() { super.onServiceConnected(); instance = this; PolicyStore.load(this) }

    override fun onAccessibilityEvent(e: AccessibilityEvent) {
        if (e.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = e.packageName?.toString() ?: return
        if (pkg == "com.android.systemui" || pkg == last) return
        last = pkg                                    // aplikasi di hadapan sekarang
        if (pkg == packageName) return
        if (PolicyStore.blockedPkgs.contains(pkg)) { kickOut(pkg); return }
        if (Prefs.state(this) != "ACTIVE") return
        if (pkg in homePkgs) { UsageBuffer.add(AppEvent("__HOME__", "Skrin utama", System.currentTimeMillis())); return }   // aplikasi sebelumnya ditutup
        val label = try { packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString() } catch (_: PackageManager.NameNotFoundException) { pkg }
        UsageBuffer.add(AppEvent(pkg, label.take(80), System.currentTimeMillis()))
    }

    private val ui = Handler(Looper.getMainLooper())

    /** Keluarkan pengguna ke skrin utama dan matikan proses latar belakang aplikasi itu (selagi masih disekat). */
    private fun kickOut(pkg: String) {
        performGlobalAction(GLOBAL_ACTION_HOME)
        ui.post { Toast.makeText(this, "Aplikasi ini disekat oleh admin.", Toast.LENGTH_LONG).show() }
        last = null                                   // supaya membuka semula aplikasi yang sama dikesan lagi
        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        for (delay in longArrayOf(1200, 4000))
            ui.postDelayed({ if (PolicyStore.blockedPkgs.contains(pkg)) runCatching { am.killBackgroundProcesses(pkg) } }, delay)
    }

    /** Dipanggil bila polisi berubah: jika aplikasi yang sedang dibuka baru sahaja disekat, terus keluarkan. */
    fun enforceNow() {
        val p = last ?: return
        if (PolicyStore.blockedPkgs.contains(p)) kickOut(p)
    }

    override fun onInterrupt() {}
    override fun onUnbind(intent: Intent?): Boolean { instance = null; return super.onUnbind(intent) }
    override fun onDestroy() { instance = null; super.onDestroy() }

    fun lockScreen(): Boolean = Build.VERSION.SDK_INT >= 28 && performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
}
