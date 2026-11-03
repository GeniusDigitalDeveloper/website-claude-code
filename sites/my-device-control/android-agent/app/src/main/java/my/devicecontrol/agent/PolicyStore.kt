package my.devicecontrol.agent

import android.content.Context

data class AppRule(val pkg: String, val label: String, val policy: String, val groupId: String?)
data class WebRule(val type: String, val action: String, val value: String, val domains: List<String>, val groupId: String?)

/**
 * Polisi berkesan untuk peranti ini (skop kumpulan mengatasi skop "semua peranti").
 * Disimpan supaya kekal selepas but, dan dibaca oleh GuardService (aplikasi) dan DnsVpnService (web).
 */
object PolicyStore {
    @Volatile var blockedPkgs: Set<String> = emptySet(); private set
    @Volatile var blockDomains: Set<String> = emptySet(); private set
    @Volatile var allowDomains: Set<String> = emptySet(); private set

    fun load(c: Context) {
        val sp = c.getSharedPreferences("policy", Context.MODE_PRIVATE)
        blockedPkgs = sp.getStringSet("pkgs", emptySet()) ?: emptySet()
        blockDomains = sp.getStringSet("block", emptySet()) ?: emptySet()
        allowDomains = sp.getStringSet("allow", emptySet()) ?: emptySet()
    }

    fun update(c: Context, myGroup: String?, apps: List<AppRule>, rules: List<WebRule>) {
        compute(myGroup, apps, rules)
        c.getSharedPreferences("policy", Context.MODE_PRIVATE).edit()
            .putStringSet("pkgs", blockedPkgs).putStringSet("block", blockDomains).putStringSet("allow", allowDomains).apply()
    }

    /** Dipisahkan daripada Context supaya boleh diuji unit. */
    fun compute(myGroup: String?, apps: List<AppRule>, rules: List<WebRule>) {
        val effective = HashMap<String, AppRule>()
        for (a in apps) {
            if (a.groupId != null && a.groupId != myGroup) continue
            val cur = effective[a.pkg]
            if (cur == null || (a.groupId != null && cur.groupId == null)) effective[a.pkg] = a
        }
        blockedPkgs = effective.values.filter { it.policy != "ALLOW" }.map { it.pkg }.toSet()
        val block = HashSet<String>(); val allow = HashSet<String>()
        for (r in rules) {
            if (r.groupId != null && r.groupId != myGroup) continue
            val list = if (r.type == "DOMAIN") listOf(r.value) else r.domains
            for (d in list) { val n = d.trim().lowercase(); if (n.isEmpty()) continue; if (r.action == "BLOCK") block.add(n) else allow.add(n) }
        }
        blockDomains = block; allowDomains = allow
    }

    /** Padanan akhiran yang paling spesifik menang; ALLOW menang jika sama atau lebih spesifik. */
    fun isBlockedHost(host: String): Boolean {
        val labels = host.trim().trimEnd('.').lowercase().split('.')
        var bestBlock = -1; var bestAllow = -1
        for (i in labels.indices) {
            val suffix = labels.subList(i, labels.size).joinToString(".")
            val len = labels.size - i
            if (len > bestBlock && blockDomains.contains(suffix)) bestBlock = len
            if (len > bestAllow && allowDomains.contains(suffix)) bestAllow = len
        }
        return bestBlock > bestAllow && bestBlock > 0
    }
}
