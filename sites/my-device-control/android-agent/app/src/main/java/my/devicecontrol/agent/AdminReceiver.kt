package my.devicecontrol.agent

import android.app.admin.DeviceAdminReceiver

/** Penerima pentadbir peranti. Dasar yang diminta: force-lock (lihat res/xml/device_admin.xml). */
class AdminReceiver : DeviceAdminReceiver()
