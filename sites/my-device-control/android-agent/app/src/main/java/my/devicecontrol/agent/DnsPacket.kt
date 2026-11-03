package my.devicecontrol.agent

/** Penghurai dan pembina paket DNS-melalui-UDP/IPv4 (fungsi tulen, diuji unit). */
object DnsPacket {
    class Query(val srcIp: ByteArray, val dstIp: ByteArray, val srcPort: Int, val dns: ByteArray, val name: String, val qEnd: Int)

    private fun u16(b: ByteArray, o: Int) = ((b[o].toInt() and 0xFF) shl 8) or (b[o + 1].toInt() and 0xFF)

    fun parseQuery(p: ByteArray): Query? {
        if (p.size < 28) return null
        if (((p[0].toInt() shr 4) and 0xF) != 4) return null
        val ihl = (p[0].toInt() and 0xF) * 4
        if (p[9].toInt() != 17 || p.size < ihl + 8) return null
        if (u16(p, ihl + 2) != 53) return null
        val srcPort = u16(p, ihl)
        val dnsLen = minOf(u16(p, ihl + 4) - 8, p.size - (ihl + 8))
        if (dnsLen < 12) return null
        val dns = p.copyOfRange(ihl + 8, ihl + 8 + dnsLen)
        if ((u16(dns, 2) and 0x8000) != 0 || u16(dns, 4) < 1) return null
        val sb = StringBuilder(); var o = 12
        while (o < dns.size) {
            val len = dns[o].toInt() and 0xFF
            if (len == 0) { o++; break }
            if (len and 0xC0 != 0 || o + 1 + len > dns.size) return null
            if (sb.isNotEmpty()) sb.append('.')
            for (i in 1..len) sb.append((dns[o + i].toInt() and 0xFF).toChar())
            o += 1 + len
        }
        if (o + 4 > dns.size) return null
        return Query(p.copyOfRange(12, 16), p.copyOfRange(16, 20), srcPort, dns, sb.toString().lowercase(), o + 4)
    }

    /** Jawapan NXDOMAIN (domain tidak wujud) untuk domain yang disekat. */
    fun blockedReply(q: Query): ByteArray {
        val r = ByteArray(q.qEnd)
        System.arraycopy(q.dns, 0, r, 0, 2)               // ID
        r[2] = 0x81.toByte(); r[3] = 0x83.toByte()         // QR=1 RD=1 RA=1 RCODE=3 (NXDOMAIN)
        r[5] = 1                                           // QDCOUNT=1
        System.arraycopy(q.dns, 12, r, 12, q.qEnd - 12)    // soalan
        return wrap(q, r)
    }

    /** Bungkus muatan DNS menjadi paket IPv4/UDP balasan kepada pemanggil asal. */
    fun wrap(q: Query, dnsPayload: ByteArray): ByteArray {
        val total = 28 + dnsPayload.size
        val p = ByteArray(total)
        p[0] = 0x45; p[2] = (total shr 8).toByte(); p[3] = total.toByte(); p[8] = 64; p[9] = 17
        System.arraycopy(q.dstIp, 0, p, 12, 4); System.arraycopy(q.srcIp, 0, p, 16, 4)
        val sum = checksum(p, 0, 20); p[10] = (sum shr 8).toByte(); p[11] = sum.toByte()
        p[20] = 0; p[21] = 53                                                // port sumber 53
        p[22] = (q.srcPort shr 8).toByte(); p[23] = q.srcPort.toByte()       // port destinasi
        val ul = 8 + dnsPayload.size; p[24] = (ul shr 8).toByte(); p[25] = ul.toByte()
        System.arraycopy(dnsPayload, 0, p, 28, dnsPayload.size)              // checksum UDP 0 dibenarkan untuk IPv4
        return p
    }

    fun checksum(b: ByteArray, off: Int, len: Int): Int {
        var s = 0L; var i = off
        while (i < off + len) { s += (((b[i].toInt() and 0xFF) shl 8) or (b[i + 1].toInt() and 0xFF)).toLong(); i += 2 }
        while (s shr 16 != 0L) s = (s and 0xFFFF) + (s shr 16)
        return (s.inv() and 0xFFFF).toInt()
    }
}
