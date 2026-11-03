package my.devicecontrol.agent

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/** Penerima pentadbir peranti. Dasar yang diminta: force-lock (lihat res/xml/device_admin.xml). */
class AdminReceiver : DeviceAdminReceiver() {
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence =
        "Menyahaktifkan akan menghalang pentadbir mengunci peranti ini, dan peranti akan ditanda perlu perhatian di panel. " +
            "Untuk melepaskan peranti dengan betul, gunakan Lepaskan peranti dalam aplikasi (perlu e-mel dan kata laluan admin)."
}
