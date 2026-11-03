package my.devicecontrol.agent

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.Executors

/**
 * Tapisan web pada peringkat DNS. VPN setempat ini HANYA memintas pertanyaan DNS (laluan 10.77.0.2/32):
 * domain yang disekat dijawab NXDOMAIN, selebihnya diteruskan ke pelayan DNS sebenar. Trafik lain tidak melaluinya.
 */
class DnsVpnService : VpnService() {
    companion object { @Volatile var running = false }

    private var tun: ParcelFileDescriptor? = null
    private var worker: Thread? = null
    private val pool = Executors.newFixedThreadPool(6)
    private val upstream = arrayOf("1.1.1.1", "8.8.8.8")

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") { stopVpn(); stopSelf(); return START_NOT_STICKY }
        if (tun == null) startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        PolicyStore.load(this)
        val t = Builder().setSession("MY DEVICE CONTROL").addAddress("10.77.0.1", 32)
            .addDnsServer("10.77.0.2").addRoute("10.77.0.2", 32).setBlocking(true).establish() ?: return
        tun = t; running = true
        worker = Thread {
            val input = FileInputStream(t.fileDescriptor); val output = FileOutputStream(t.fileDescriptor); val buf = ByteArray(32767)
            while (running) {
                val n = try { input.read(buf) } catch (_: Exception) { break }
                if (n <= 0) continue
                val pkt = buf.copyOf(n)
                pool.execute { try { handle(pkt, output) } catch (_: Exception) {} }
            }
        }.also { it.isDaemon = true; it.start() }
    }

    private fun handle(pkt: ByteArray, out: FileOutputStream) {
        val q = DnsPacket.parseQuery(pkt) ?: return
        val reply = if (PolicyStore.isBlockedHost(q.name)) DnsPacket.blockedReply(q)
        else DnsPacket.wrap(q, forward(q.dns) ?: return)
        synchronized(out) { out.write(reply) }
    }

    private fun forward(dns: ByteArray): ByteArray? {
        for (host in upstream) {
            try {
                DatagramSocket().use { s ->
                    protect(s); s.soTimeout = 3000
                    s.send(DatagramPacket(dns, dns.size, InetAddress.getByName(host), 53))
                    val buf = ByteArray(4096); val p = DatagramPacket(buf, buf.size); s.receive(p)
                    return buf.copyOf(p.length)
                }
            } catch (_: Exception) { }
        }
        return null
    }

    private fun stopVpn() { running = false; try { tun?.close() } catch (_: Exception) {}; tun = null }
    override fun onDestroy() { stopVpn(); pool.shutdownNow(); super.onDestroy() }
    override fun onRevoke() { stopVpn(); super.onRevoke() }
}
