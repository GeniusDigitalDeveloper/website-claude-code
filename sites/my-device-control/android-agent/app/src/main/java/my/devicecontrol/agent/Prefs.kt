package my.devicecontrol.agent

import android.content.Context

object Prefs {
    private fun sp(c: Context) = c.getSharedPreferences("agent", Context.MODE_PRIVATE)
    fun enrolled(c: Context) = sp(c).getBoolean("enrolled", false)
    fun setEnrolled(c: Context, v: Boolean) = sp(c).edit().putBoolean("enrolled", v).apply()
    /** Keadaan kunci kiosk (hanya bermakna untuk Device Owner). */
    fun locked(c: Context) = sp(c).getBoolean("locked", false)
    fun setLocked(c: Context, v: Boolean) = sp(c).edit().putBoolean("locked", v).apply()
}
