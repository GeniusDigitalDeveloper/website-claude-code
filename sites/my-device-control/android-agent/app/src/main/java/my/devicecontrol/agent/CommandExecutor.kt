package my.devicecontrol.agent

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Melaksanakan arahan dan melapor hasil SEBENAR (berjaya/gagal + sebab).
 *  LOCK    : Device Owner -> skrin kiosk (LockTask); pentadbir peranti biasa -> lockNow()
 *  UNLOCK  : hanya boleh membuka kunci kiosk. lockNow() tidak boleh dibatalkan dari jauh (pengguna masukkan PIN).
 *  REBOOT  : hanya Device Owner
 */
class CommandExecutor(private val ctx: Context) {
    private val dpm = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin = ComponentName(ctx, AdminReceiver::class.java)

    fun isAdminActive() = dpm.isAdminActive(admin)
    fun isOwner() = dpm.isDeviceOwnerApp(ctx.packageName)

    fun run(type: String): Pair<Boolean, String?> = when (type) {
        "LOCK" -> lock()
        "UNLOCK" -> unlock()
        "REBOOT" -> if (isOwner()) Pair(true, null) else Pair(false, "REBOOT memerlukan Device Owner.")
        "SYNC_POLICY" -> Pair(true, null)
        else -> Pair(false, "Jenis arahan tidak disokong: $type")
    }

    fun reboot() { if (isOwner()) dpm.reboot(admin) }

    fun showKioskLock() {
        dpm.setLockTaskPackages(admin, arrayOf(ctx.packageName))
        ctx.startActivity(Intent(ctx, LockActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun lock(): Pair<Boolean, String?> {
        if (isOwner()) {
            showKioskLock(); Prefs.setLocked(ctx, true); return Pair(true, null)
        }
        if (isAdminActive()) {
            dpm.lockNow(); return Pair(true, null)   // skrin dikunci; pengguna membuka dengan PIN
        }
        return Pair(false, "Kebenaran pentadbir peranti belum diaktifkan pada peranti ini.")
    }

    private fun unlock(): Pair<Boolean, String?> {
        if (Prefs.locked(ctx)) {
            LockActivity.current?.finish(); Prefs.setLocked(ctx, false); return Pair(true, null)
        }
        return if (isOwner()) Pair(true, null)
        else Pair(false, "Unlock jauh tidak disokong tanpa Device Owner (kiosk). Pengguna membuka skrin dengan PIN.")
    }
}
