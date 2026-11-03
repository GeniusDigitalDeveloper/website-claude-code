package my.devicecontrol.agent

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

/**
 * Pantau skrin SELEPAS pengguna membenarkan. Notifikasi "Skrin sedang dipantau" sentiasa kelihatan dengan butang Henti,
 * dan Android memaparkan penunjuk rakaman skrin sendiri. Hantar satu bingkai JPEG kecil setiap saat selagi sesi aktif.
 */
class ScreenShareService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var projection: MediaProjection? = null
    private var display: VirtualDisplay? = null
    private var reader: ImageReader? = null
    private var job: Job? = null
    private var stopped = false
    private lateinit var repo: Repo

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        repo = Repo(applicationContext)
        if (intent?.action == "STOP") { finishSharing(); return START_NOT_STICKY }
        showNotification()
        val code = intent?.getIntExtra("code", 0) ?: 0
        val data: Intent? = if (Build.VERSION.SDK_INT >= 33) intent?.getParcelableExtra("data", Intent::class.java)
        else @Suppress("DEPRECATION") intent?.getParcelableExtra("data")
        if (data == null) { finishSharing(); return START_NOT_STICKY }
        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        val proj = mpm.getMediaProjection(code, data); projection = proj
        proj.registerCallback(object : MediaProjection.Callback() { override fun onStop() { finishSharing() } }, Handler(Looper.getMainLooper()))
        val dm = resources.displayMetrics
        val scale = minOf(1f, 540f / dm.widthPixels)
        val w = (dm.widthPixels * scale).toInt(); val h = (dm.heightPixels * scale).toInt()
        val rd = ImageReader.newInstance(w, h, PixelFormat.RGBA_8888, 2); reader = rd
        display = proj.createVirtualDisplay("mdc-screen", w, h, dm.densityDpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, rd.surface, null, null)
        job = scope.launch {
            var seq = 0L
            runCatching { repo.liveState("ACTIVE") }
            while (isActive) {
                delay(1000)
                val b64 = grab(rd, w, h) ?: continue
                runCatching { repo.liveFrame(b64, w, h, ++seq) }
            }
        }
        return START_NOT_STICKY
    }

    private fun grab(rd: ImageReader, w: Int, h: Int): String? {
        val img = rd.acquireLatestImage() ?: return null
        try {
            val plane = img.planes[0]
            val rowPad = plane.rowStride - plane.pixelStride * w
            val wide = Bitmap.createBitmap(w + rowPad / plane.pixelStride, h, Bitmap.Config.ARGB_8888)
            wide.copyPixelsFromBuffer(plane.buffer)
            val bmp = Bitmap.createBitmap(wide, 0, 0, w, h)
            val out = ByteArrayOutputStream(); bmp.compress(Bitmap.CompressFormat.JPEG, 45, out)
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } finally { img.close() }
    }

    private fun showNotification() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) nm.createNotificationChannel(NotificationChannel("share", "Pantau skrin", NotificationManager.IMPORTANCE_LOW))
        val stop = PendingIntent.getService(this, 5, Intent(this, ScreenShareService::class.java).setAction("STOP"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n: Notification = NotificationCompat.Builder(this, "share").setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Skrin sedang dipantau oleh admin").setContentText("Ketuk Henti untuk menamatkan.")
            .addAction(0, "Henti", stop).setOngoing(true).build()
        if (Build.VERSION.SDK_INT >= 29) startForeground(6, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION) else startForeground(6, n)
    }

    private fun finishSharing() {
        if (stopped) return
        stopped = true
        job?.cancel()
        try { display?.release() } catch (_: Exception) {}
        try { reader?.close() } catch (_: Exception) {}
        try { projection?.stop() } catch (_: Exception) {}
        val r = repo
        CoroutineScope(Dispatchers.IO).launch { runCatching { r.liveState("STOPPED") } }
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
    }

    override fun onDestroy() { finishSharing(); scope.cancel(); super.onDestroy() }
}
