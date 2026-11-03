package my.devicecontrol.agent

import android.content.Context
import android.content.SharedPreferences

object Prefs {
    private fun sp(c: Context) = c.getSharedPreferences("agent", Context.MODE_PRIVATE)

    /** NONE = belum diimbas, PENDING = menunggu kelulusan admin, ACTIVE = diterima dan dikawal. */
    fun state(c: Context): String = sp(c).getString("state", "NONE") ?: "NONE"
    fun setState(c: Context, v: String) = sp(c).edit().putString("state", v).apply()
    fun enrolled(c: Context) = state(c) != "NONE"
    fun setEnrolled(c: Context, v: Boolean) = setState(c, if (v) "PENDING" else "NONE")

    /** Keadaan kunci kiosk (hanya bermakna untuk Device Owner). */
    fun locked(c: Context) = sp(c).getBoolean("locked", false)
    fun setLocked(c: Context, v: Boolean) = sp(c).edit().putBoolean("locked", v).apply()

    fun listen(c: Context, l: SharedPreferences.OnSharedPreferenceChangeListener) = sp(c).registerOnSharedPreferenceChangeListener(l)
    fun unlisten(c: Context, l: SharedPreferences.OnSharedPreferenceChangeListener) = sp(c).unregisterOnSharedPreferenceChangeListener(l)
}
