package my.devicecontrol.agent

import android.Manifest
import android.net.VpnService
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.zxing.BarcodeFormat
import com.google.zxing.ResultPoint
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * Skrin pertama ialah KAMERA. Imbas kod QR dari panel admin, kemudian tunggu admin menekan Terima.
 * Tiada skrin tetapan lain.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var scanner: DecoratedBarcodeView
    private lateinit var scanBox: FrameLayout
    private lateinit var statusBox: LinearLayout
    private lateinit var title: TextView
    private lateinit var body: TextView
    private lateinit var scanMsg: TextView
    private var busy = false
    private lateinit var accBtn: Button
    private lateinit var vpnBtn: Button
    private val vpnLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { refresh() }

    private val camPerm = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) startScanning() else scanMsg.text = "Kebenaran kamera diperlukan untuk mengimbas kod QR. Ketuk di sini untuk membukanya di Tetapan."
    }
    private val notifPerm = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }
    private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ -> runOnUiThread { refresh() } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val d = resources.displayMetrics.density
        val pad = (20 * d).toInt()

        scanner = DecoratedBarcodeView(this)
        scanner.barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
        scanner.setStatusText("")
        scanner.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult) {
                val text = result.text ?: return
                if (busy) return
                busy = true; scanner.pause(); enroll(parseCode(text))
            }
            override fun possibleResultPoints(resultPoints: List<ResultPoint>) {}
        })
        scanMsg = TextView(this).apply {
            text = "Imbas kod QR dari panel admin (All Devices > Daftar peranti)"
            textSize = 16f; setTextColor(Color.WHITE); gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#990F172A")); setPadding(pad, pad, pad, pad)
            setOnClickListener { if (!hasCamera()) startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }
        }
        val paste = Button(this).apply { text = "Tampal kod"; setOnClickListener { askPaste() } }
        scanBox = FrameLayout(this).apply {
            addView(scanner, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(scanMsg, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP))
            addView(paste, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply { bottomMargin = pad })
        }

        title = TextView(this).apply { textSize = 24f; setTextColor(Color.WHITE); gravity = Gravity.CENTER }
        body = TextView(this).apply { textSize = 16f; setTextColor(Color.parseColor("#CBD5E1")); gravity = Gravity.CENTER; setPadding(0, pad, 0, pad) }
        accBtn = Button(this).apply { setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } }
        vpnBtn = Button(this).apply { setOnClickListener { val i = VpnService.prepare(this@MainActivity); if (i != null) vpnLauncher.launch(i) else refresh() } }
        statusBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(pad, pad, pad, pad)
            setBackgroundColor(Color.parseColor("#0F172A")); visibility = View.GONE
            addView(title); addView(body); addView(accBtn); addView(vpnBtn)
        }
        setContentView(FrameLayout(this).apply { addView(scanBox); addView(statusBox) })

    }

    override fun onResume() {
        super.onResume()
        Prefs.listen(this, prefListener)
        refresh()
    }

    override fun onPause() {
        Prefs.unlisten(this, prefListener)
        scanner.pause()
        super.onPause()
    }

    private fun hasCamera() = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

    private fun startScanning() { busy = false; scanner.resume() }

    private fun refresh() {
        when (Prefs.state(this)) {
            "NONE" -> {
                statusBox.visibility = View.GONE; scanBox.visibility = View.VISIBLE
                if (hasCamera()) startScanning() else camPerm.launch(Manifest.permission.CAMERA)
            }
            else -> {
                scanner.pause(); scanBox.visibility = View.GONE; statusBox.visibility = View.VISIBLE
                if (Prefs.state(this) == "PENDING") {
                    title.text = "Menunggu pengesahan admin"
                    body.text = "Kod QR telah diimbas. Pentadbir perlu menekan Sahkan di panel admin. Biarkan aplikasi ini."
                } else {
                    title.text = "Disambungkan"
                    body.text = "Peranti ini diurus oleh admin."
                }
                val active = Prefs.state(this) == "ACTIVE"
                accBtn.text = if (GuardService.instance != null) "✔ Kawalan aplikasi dan kunci skrin: aktif" else "Aktifkan kawalan aplikasi dan kunci skrin (Aksesibiliti)"
                vpnBtn.text = if (VpnService.prepare(this) == null) "✔ Tapisan web: aktif" else "Aktifkan tapisan web (VPN)"
                accBtn.visibility = if (active) View.VISIBLE else View.GONE
                vpnBtn.visibility = if (active) View.VISIBLE else View.GONE
                ContextCompat.startForegroundService(this, Intent(this, AgentService::class.java))
            }
        }
    }

    /** Terima token biasa; kod JSON lama ({"code":"..."}) juga diterima. */
    private fun parseCode(raw: String): String {
        val t = raw.trim()
        val code = if (t.startsWith("{")) try { JSONObject(t).optString("code") } catch (e: Exception) { "" } else t
        return code.replace(Regex("[\\s\"'“”]"), "")
    }

    private fun enroll(code: String) {
        if (code.length < 24) { toast("Kod QR tidak sah."); resumeScanSoon(); return }
        toast("Mendaftar…")
        lifecycleScope.launch {
            try {
                Repo(applicationContext).enroll(code)
                Prefs.setState(this@MainActivity, "PENDING")
                if (Build.VERSION.SDK_INT >= 33) notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
                toast("Kod diterima. Menunggu pengesahan admin.")
                refresh()
            } catch (e: Exception) {
                toast(e.message ?: "Pendaftaran gagal.")
                resumeScanSoon()
            }
        }
    }

    private fun resumeScanSoon() {
        lifecycleScope.launch { delay(2000); if (Prefs.state(this@MainActivity) == "NONE") startScanning() }
    }

    private fun askPaste() {
        val et = EditText(this).apply { hint = "Kod enrollment"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD }
        AlertDialog.Builder(this).setTitle("Tampal kod").setView(et).setNegativeButton("Batal", null)
            .setPositiveButton("Daftar") { _, _ -> busy = true; scanner.pause(); enroll(parseCode(et.text.toString())) }.show()
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()
}
