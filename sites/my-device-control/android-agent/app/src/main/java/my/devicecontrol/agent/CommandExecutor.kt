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

    /** Selagi diurus: Device Owner menghalang nyahpasang; pentadbir peranti biasa menghalang nyahpasang sehingga dinyahaktifkan. */
    fun protect() { try { if (isOwner()) dpm.setUninstallBlocked(admin, ctx.packageName, true) } catch (_: Exception) {} }

    /** Dilepaskan oleh admin: buang semua kawalan (kiosk, Device Owner, pentadbir peranti). */
    @Suppress("DEPRECATION")
    fun release() {
        LockActivity.current?.finish(); Prefs.setLocked(ctx, false)
        try { if (isOwner()) dpm.setUninstallBlocked(admin, ctx.packageName, false) } catch (_: Exception) {}
        try { if (isOwner()) dpm.clearDeviceOwnerApp(ctx.packageName) } catch (_: Exception) {}
        try { if (isAdminActive()) dpm.removeActiveAdmin(admin) } catch (_: Exception) {}
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
        if (GuardService.instance?.lockScreen() == true) { Prefs.setAdminLockMs(ctx, System.currentTimeMillis()); Prefs.setAdminHold(ctx, true); Prefs.setLocked(ctx, true); return Pair(true, null) }      // kunci melalui Aksesibiliti
        if (isAdminActive()) { Prefs.setAdminLockMs(ctx, System.currentTimeMillis()); Prefs.setAdminHold(ctx, true); dpm.lockNow(); Prefs.setLocked(ctx, true); return Pair(true, null) }
        return Pair(false, "Aktifkan Kawalan (Aksesibiliti) pada peranti untuk membolehkan kunci skrin. Ketuk notifikasi pada peranti.")
    }

    private fun unlock(): Pair<Boolean, String?> {
        if (Prefs.locked(ctx)) {
            LockActivity.current?.finish(); Prefs.setLocked(ctx, false); return Pair(true, null)
        }
        return if (isOwner()) Pair(true, null)
        else Pair(false, "Unlock jauh tidak disokong tanpa Device Owner (kiosk). Pengguna membuka skrin dengan PIN.")
    }
}
