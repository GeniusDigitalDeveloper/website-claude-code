package my.devicecontrol.agent

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

/** Skrin kunci kiosk yang jelas kelihatan (bukan tersembunyi). Hanya untuk Device Owner. */
class LockActivity : Activity() {
    companion object { @Volatile var current: LockActivity? = null }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        current = this
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val tv = TextView(this).apply {
            text = "Peranti ini dikunci oleh pentadbir.\n\nSila hubungi pentadbir untuk membukanya."
            textSize = 22f; gravity = Gravity.CENTER; setTextColor(Color.WHITE); setPadding(48, 48, 48, 48)
        }
        setContentView(FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0F172A"))
            addView(tv, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        })
        try { startLockTask() } catch (_: Exception) {}
    }

    @Deprecated("Disekat semasa dikunci")
    override fun onBackPressed() { /* disekat semasa dikunci */ }

    override fun onDestroy() {
        try { stopLockTask() } catch (_: Exception) {}
        if (current === this) current = null
        super.onDestroy()
    }
}
