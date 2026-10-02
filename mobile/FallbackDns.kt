/*
 * UniaoTV Mobile - DNS fallback helper.
 * This file is distributed under GPL-3.0-or-later with the modified OpenTV build.
 */
package app.opentv.core

import java.net.InetAddress
import java.net.UnknownHostException
import okhttp3.Dns
import okhttp3.OkHttpClient
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.dnsoverhttps.DnsOverHttps

/**
 * Uses Android/system DNS first. If that resolver cannot resolve a hostname,
 * retry through Cloudflare DNS-over-HTTPS using bootstrap IPs.
 *
 * HTTPS certificate validation is NOT disabled. This only changes name resolution.
 */
class FallbackDns : Dns {
    private val systemDns = Dns.SYSTEM

    private val doh: Dns by lazy {
        val bootstrapClient = OkHttpClient.Builder()
            .dns(Dns.SYSTEM)
            .build()

        DnsOverHttps.Builder()
            .client(bootstrapClient)
            .url("https://cloudflare-dns.com/dns-query".toHttpUrl())
            .bootstrapDnsHosts(
                InetAddress.getByName("1.1.1.1"),
                InetAddress.getByName("1.0.0.1"),
                InetAddress.getByName("2606:4700:4700::1111"),
                InetAddress.getByName("2606:4700:4700::1001"),
            )
            .includeIPv6(true)
            .resolvePrivateAddresses(false)
            .build()
    }

    override fun lookup(hostname: String): List<InetAddress> {
        return try {
            val result = systemDns.lookup(hostname)
            if (result.isNotEmpty()) result else doh.lookup(hostname)
        } catch (_: UnknownHostException) {
            doh.lookup(hostname)
        }
    }
}
