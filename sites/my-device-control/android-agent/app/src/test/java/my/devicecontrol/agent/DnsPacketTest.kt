package my.devicecontrol.agent

import org.junit.Assert.*
import org.junit.Test

class DnsPacketTest {
    /** Bina paket IPv4/UDP/DNS pertanyaan jenis A untuk [name]. */
    private fun query(name: String, id: Int = 0x1234): ByteArray {
        val q = java.io.ByteArrayOutputStream()
        q.write(byteArrayOf((id shr 8).toByte(), id.toByte(), 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0))
        for (l in name.split('.')) { q.write(l.length); q.write(l.toByteArray()) }
        q.write(0); q.write(byteArrayOf(0, 1, 0, 1))
        val dns = q.toByteArray(); val total = 28 + dns.size
        val p = ByteArray(total)
        p[0] = 0x45; p[2] = (total shr 8).toByte(); p[3] = total.toByte(); p[8] = 64; p[9] = 17
        byteArrayOf(10, 77, 0, 1).copyInto(p, 12); byteArrayOf(10, 77, 0, 2).copyInto(p, 16)
        p[20] = 0xC3.toByte(); p[21] = 0x50; p[23] = 53                       // src 50000 -> dst 53
        val ul = 8 + dns.size; p[24] = (ul shr 8).toByte(); p[25] = ul.toByte()
        dns.copyInto(p, 28); return p
    }

    @Test fun parsesName() {
        val q = DnsPacket.parseQuery(query("www.TikTok.com"))!!
        assertEquals("www.tiktok.com", q.name); assertEquals(50000, q.srcPort)
    }
    @Test fun ignoresNonDns() { val p = query("a.com"); p[23] = 80; assertNull(DnsPacket.parseQuery(p)); assertNull(DnsPacket.parseQuery(ByteArray(10))) }
    @Test fun nxdomainReplyIsValid() {
        val q = DnsPacket.parseQuery(query("tiktok.com", 0xBEEF))!!
        val r = DnsPacket.blockedReply(q)
        assertEquals(0, DnsPacket.checksum(r, 0, 20))                      // checksum IP sah
        assertEquals(10, r[12].toInt()); assertEquals(2, r[15].toInt())    // sumber = 10.77.0.2
        assertEquals(1, r[19].toInt())                                     // destinasi = 10.77.0.1
        assertEquals(53, ((r[20].toInt() and 0xFF) shl 8) or (r[21].toInt() and 0xFF))
        assertEquals(50000, ((r[22].toInt() and 0xFF) shl 8) or (r[23].toInt() and 0xFF))
        assertEquals(0xBE.toByte(), r[28]); assertEquals(0xEF.toByte(), r[29])  // ID dikekalkan
        assertEquals(0x83.toByte(), r[31]); assertTrue((r[30].toInt() and 0x80) != 0)  // QR=1, RCODE=3
        assertEquals(0, r[34].toInt()); assertEquals(1, r[33].toInt())     // QD=1, AN=0
    }
    @Test fun wrapKeepsPayload() {
        val q = DnsPacket.parseQuery(query("a.com"))!!; val payload = byteArrayOf(1, 2, 3, 4, 5, 6)
        val r = DnsPacket.wrap(q, payload); assertEquals(34, r.size); assertEquals(0, DnsPacket.checksum(r, 0, 20)); assertEquals(6, r[33].toInt())
    }

    @Test fun domainRulesSuffixAndAllowWins() {
        val rules = listOf(
            WebRule("DOMAIN", "BLOCK", "tiktok.com", emptyList(), null),
            WebRule("CATEGORY", "BLOCK", "SOCIAL_MEDIA", listOf("facebook.com", "instagram.com"), null),
            WebRule("DOMAIN", "ALLOW", "safe.facebook.com", emptyList(), null),
            WebRule("DOMAIN", "BLOCK", "roblox.com", emptyList(), "g1"))
        PolicyStore.compute("g2", emptyList(), rules)
        assertTrue(PolicyStore.isBlockedHost("tiktok.com")); assertTrue(PolicyStore.isBlockedHost("v16.www.tiktok.com"))
        assertTrue(PolicyStore.isBlockedHost("instagram.com"))
        assertFalse(PolicyStore.isBlockedHost("safe.facebook.com")); assertFalse(PolicyStore.isBlockedHost("x.safe.facebook.com"))
        assertTrue(PolicyStore.isBlockedHost("m.facebook.com"))
        assertFalse(PolicyStore.isBlockedHost("roblox.com"))            // peraturan kumpulan lain
        assertFalse(PolicyStore.isBlockedHost("nottiktok.com")); assertFalse(PolicyStore.isBlockedHost("com"))
        PolicyStore.compute("g1", emptyList(), rules); assertTrue(PolicyStore.isBlockedHost("roblox.com"))
    }
    @Test fun appPolicyGroupOverridesGlobal() {
        val apps = listOf(AppRule("com.yt", "YouTube", "BLOCK", null), AppRule("com.yt", "YouTube", "ALLOW", "g1"),
            AppRule("com.tt", "TikTok", "REQUIRE_APPROVAL", null), AppRule("com.fb", "FB", "BLOCK", "g9"), AppRule("com.wa", "WA", "ALLOW", null))
        PolicyStore.compute("g1", apps, emptyList()); assertEquals(setOf("com.tt"), PolicyStore.blockedPkgs)
        PolicyStore.compute("g2", apps, emptyList()); assertEquals(setOf("com.yt", "com.tt"), PolicyStore.blockedPkgs)
        PolicyStore.compute("g9", apps, emptyList()); assertEquals(setOf("com.yt", "com.tt", "com.fb"), PolicyStore.blockedPkgs)
    }
}
