package my.devicecontrol.agent

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/** Memaparkan dialog kebenaran sistem Android untuk merakam skrin. Tanpa ketukan pengguna, tiada apa dirakam. */
class ConsentActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        @Suppress("DEPRECATION") startActivityForResult(mpm.createScreenCaptureIntent(), 77)
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 77 && resultCode == RESULT_OK && data != null) {
            ContextCompat.startForegroundService(this, Intent(this, ScreenShareService::class.java).putExtra("code", resultCode).putExtra("data", data))
        } else {
            val app = applicationContext
            CoroutineScope(Dispatchers.IO).launch { runCatching { Repo(app).liveState("DECLINED") } }
        }
        finish()
    }
}
