package my.devicecontrol.agent

import android.Manifest
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Skrin tetapan: aktifkan pentadbir peranti, daftar dengan kod enrollment dari panel admin. */
class MainActivity : AppCompatActivity() {
    private lateinit var status: TextView
    private lateinit var input: EditText
    private lateinit var enrollBtn: Button
    private lateinit var releaseBtn: Button

    private val scan = registerForActivityResult(ScanContract()) { r -> r.contents?.let { input.setText(it); enroll() } }
    private fun startScan() =
        scan.launch(ScanOptions().setBeepEnabled(false).setPrompt("Imbas kod QR dari panel admin").setOrientationLocked(false))

    private val notifPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (16 * resources.displayMetrics.density).toInt()
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, pad, pad, pad) }
        fun text(s: String, size: Float = 14f, bold: Boolean = false) = TextView(this).apply {
            text = s; textSize = size; if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD); setPadding(0, pad / 2, 0, pad / 2)
        }
        fun button(s: String, onClick: () -> Unit) = Button(this).apply { text = s; setOnClickListener { onClick() } }

        col.addView(text("MY DEVICE CONTROL", 22f, true))
        col.addView(text("Agent peranti. Peranti ini akan diurus dan dipantau oleh pentadbir organisasi. Hanya status peranti, bateri dan arahan pengurusan digunakan; tiada mesej, kata laluan atau ketukan kekunci dikumpul."))
        status = text("")
        col.addView(status)
        col.addView(button("Aktifkan pentadbir peranti (untuk kunci skrin)") { requestAdmin() })
        col.addView(text("Imbas kod QR dari panel admin. Peranti terus didaftarkan. Atau tampal kod secara manual:"))
        input = EditText(this).apply {
            hint = "Kod enrollment"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD; maxLines = 3
        }
        col.addView(input, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        col.addView(button("Imbas kod QR") { startScan() })
        enrollBtn = button("Daftar dengan kod yang ditampal") { enroll() }
        col.addView(enrollBtn)
        releaseBtn = button("Lepaskan peranti (perlu e-mel & kata laluan admin)") { askRelease() }
        col.addView(releaseBtn)
        setContentView(ScrollView(this).apply { addView(col) })

        if (Build.VERSION.SDK_INT >= 33) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        // Belum didaftarkan: terus buka kamera untuk mengimbas kod QR (tiada langkah lain)
        if (savedInstanceState == null && !Prefs.enrolled(this)) startScan()
    }

    override fun onResume() { super.onResume(); refresh() }

    private fun refresh() {
        val ex = CommandExecutor(this)
        val enrolled = Prefs.enrolled(this)
        status.text = buildString {
            append("Status daftar: ").append(if (enrolled) "SUDAH DIDAFTARKAN" else "belum didaftarkan").append('\n')
            append("Pentadbir peranti: ").append(if (ex.isAdminActive()) "aktif" else "belum aktif").append('\n')
            append("Device Owner (kiosk/unlock jauh/reboot): ").append(if (ex.isOwner()) "ya" else "tidak")
        }
        enrollBtn.isEnabled = !enrolled
        releaseBtn.visibility = if (enrolled) android.view.View.VISIBLE else android.view.View.GONE
        if (enrolled) ContextCompat.startForegroundService(this, Intent(this, AgentService::class.java))
    }

    private fun askRelease() {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 24, 48, 0) }
        val em = EditText(this).apply { hint = "E-mel admin"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS }
        val pw = EditText(this).apply { hint = "Kata laluan"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        box.addView(em); box.addView(pw)
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Lepaskan peranti")
            .setMessage("Masukkan e-mel dan kata laluan salah satu akaun Firebase Authentication. Peranti akan dibuang dari panel dan aplikasi boleh dinyahpasang.")
            .setView(box).setNegativeButton("Batal", null)
            .setPositiveButton("Lepaskan") { _, _ -> release(em.text.toString().trim(), pw.text.toString()) }.show()
    }

    private fun release(email: String, password: String) {
        if (email.isEmpty() || password.isEmpty()) { toast("Masukkan e-mel dan kata laluan."); return }
        toast("Mengesahkan…")
        lifecycleScope.launch {
            try {
                Repo(applicationContext).adminRelease(email, password)
                CommandExecutor(this@MainActivity).release()
                Prefs.setEnrolled(this@MainActivity, false)
                com.google.firebase.auth.FirebaseAuth.getInstance().signOut()
                stopService(Intent(this@MainActivity, AgentService::class.java))
                toast("Peranti dilepaskan. Anda boleh menyahpasang aplikasi ini.")
                refresh()
                startActivity(Intent(Intent.ACTION_DELETE, android.net.Uri.parse("package:$packageName")))
            } catch (e: Exception) { toast(e.message ?: "Gagal melepaskan peranti.") }
        }
    }

    private fun requestAdmin() {
        startActivity(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, ComponentName(this, AdminReceiver::class.java))
            .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Membolehkan pentadbir mengunci skrin peranti ini dari jauh."))
    }

    /** Terima token biasa; kod JSON lama ({"code":"..."}) juga diterima. */
    private fun parseCode(raw: String): String {
        val t = raw.trim()
        val code = if (t.startsWith("{")) try { JSONObject(t).optString("code") } catch (e: Exception) { "" } else t
        return code.replace(Regex("[\\s\"'“”]"), "")
    }

    private fun enroll() {
        val code = parseCode(input.text.toString())
        if (code.length < 24) { toast("Kod terlalu pendek. Salin kod penuh dari panel admin."); return }
        enrollBtn.isEnabled = false
        toast("Mendaftar…")
        lifecycleScope.launch {
            try {
                Repo(applicationContext).enroll(code)
                Prefs.setEnrolled(this@MainActivity, true)
                toast("Peranti berjaya didaftarkan.")
                if (!CommandExecutor(this@MainActivity).isAdminActive()) requestAdmin()
            } catch (e: Exception) {
                toast(e.message ?: "Pendaftaran gagal.")
            }
            refresh()
        }
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()
}
