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

    private val scan = registerForActivityResult(ScanContract()) { r -> r.contents?.let { input.setText(it) } }
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
        col.addView(button("1. Aktifkan pentadbir peranti") { requestAdmin() })
        col.addView(text("2. Tampal kod enrollment dari panel admin (atau imbas kod QR)"))
        input = EditText(this).apply {
            hint = """{"v":1,"projectId":"...","code":"...","name":"...","type":"ANDROID"}"""
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE; minLines = 3
        }
        col.addView(input, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        col.addView(button("Imbas kod QR") { scan.launch(ScanOptions().setBeepEnabled(false).setPrompt("Imbas kod QR enrollment").setOrientationLocked(false)) })
        enrollBtn = button("3. Daftar peranti") { enroll() }
        col.addView(enrollBtn)
        setContentView(ScrollView(this).apply { addView(col) })

        if (Build.VERSION.SDK_INT >= 33) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
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
        if (enrolled) ContextCompat.startForegroundService(this, Intent(this, AgentService::class.java))
    }

    private fun requestAdmin() {
        startActivity(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, ComponentName(this, AdminReceiver::class.java))
            .putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Membolehkan pentadbir mengunci skrin peranti ini dari jauh."))
    }

    private fun enroll() {
        val j = try { JSONObject(input.text.toString().trim()) } catch (e: Exception) { toast("Kod enrollment tidak sah (bukan JSON)."); return }
        val code = j.optString("code"); val name = j.optString("name"); val type = j.optString("type", "ANDROID")
        if (code.length < 24 || name.isBlank() || j.optString("projectId") != AgentConfig.PROJECT_ID) { toast("Kod enrollment tidak lengkap atau untuk projek lain."); return }
        enrollBtn.isEnabled = false
        lifecycleScope.launch {
            try {
                Repo(applicationContext).enroll(code, name, type)
                Prefs.setEnrolled(this@MainActivity, true)
                toast("Peranti berjaya didaftarkan.")
            } catch (e: Exception) {
                toast(e.message ?: "Pendaftaran gagal.")
            }
            refresh()
        }
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()
}
