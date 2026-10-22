# SiteScope — Crawler Security & SSRF Defense Specification

## 1. Executive Summary & Threat Model

Allowing users to input arbitrary URLs for automated web crawling creates severe Server-Side Request Forgery (SSRF) vulnerabilities. If an attacker submits URLs pointing to internal networks (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), loopback interfaces (`127.0.0.1`, `localhost`), link-local services, or cloud instance metadata services (`169.254.169.254`), an unhardened crawler could expose cloud credentials, internal Redis queues, Supabase databases, or private infrastructure.

**Core Mandate**: String-based URL parsing is completely inadequate. Validation must occur at the URL parser, DNS resolution level, connection socket establishment level, and on every individual redirect hop.

---

## 2. Multi-Layer SSRF Defense Architecture

```text
User Input URL
     │
     ▼ Layer 1: Protocol & Syntax Normalization
  [Scheme Allowlist: ONLY http:// or https://]
  [Reject Credentials in URL: user:pass@host]
  [Normalize Punycode / IDN domains]
     │
     ▼ Layer 2: Pre-Flight DNS Resolution & Blocklist Check
  [Resolve all IPv4 (A) and IPv6 (AAAA) records via trusted resolver]
  [Check EVERY resolved IP against Disallowed CIDR ranges]
  [Reject if ANY resolved IP is private, reserved, loopback, or cloud metadata]
     │
     ▼ Layer 3: Socket-Level Destination Pinning (DNS Rebinding Defense)
  [Custom Node.js http.Agent / https.Agent lookup override]
  [Pin the exact resolved, validated IP address to the TCP socket]
  [Prevent Time-Of-Check to Time-Of-Use (TOCTOU) DNS Rebinding]
     │
     ▼ Layer 4: Redirect Hop Re-Validation
  [Crawler intercepts EVERY HTTP 3xx redirect]
  [Max redirects strictly bounded to 5 hops]
  [Each Location header URL must pass Layers 1, 2, and 3 before fetching]
     │
     ▼ Layer 5: Network Egress Isolation (Defense in Depth)
  [Render Worker outbound firewall rules]
  [Block outbound TCP traffic to private IP subnets at the OS/Container level]
```

---

## 3. Detailed Defense Implementations

### A. Layer 1: URL Normalization & Scheme Allowlist
1. **Allowed Protocols**: `http:` and `https:` exclusively. Reject `file:`, `ftp:`, `gopher:`, `data:`, `blob:`, `ldap:`, `dict:`, `ws:`, `wss:`.
2. **Credential Stripping**: Reject any URL containing an embedded username or password (e.g. `http://admin:secret@victim.com`).
3. **Port Restrictions**: Only allow standard web ports: `80`, `443`, or explicitly configured standard alternate ports (`8080`, `8443`). Reject internal service ports (`6379` Redis, `5432` PostgreSQL, `22` SSH, `2375` Docker, etc.).
4. **Canonicalization**: Normalize domain names using Node.js `URL` parser and standard WHATWG compliance. Convert IDN/Unicode domains to Punycode to prevent visual spoofing and null-byte injection.

### B. Layer 2: Comprehensive IP Blacklist (IPv4 & IPv6)
Every hostname must be resolved to all its IP addresses. If **any** returned address falls into any of the following CIDR ranges, the request is immediately aborted with `SSRF_DISALLOWED_DESTINATION`:

| Range Classification | CIDR Subnets | Description / Risk |
| :--- | :--- | :--- |
| **Loopback** | `127.0.0.0/8`, `::1/128` | Localhost access to local worker services |
| **Private Networks (RFC 1918)** | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | Internal VPC/host networks |
| **Carrier-Grade NAT (RFC 6598)** | `100.64.0.0/10` | Shared service provider address space |
| **Link-Local & Cloud Metadata** | `169.254.0.0/16`, `fe80::/10` | AWS/GCP/Azure/Render instance metadata (`169.254.169.254`) |
| **Unique Local Addresses (IPv6)** | `fc00::/7` | Private IPv6 subnets |
| **IPv4-Mapped IPv6** | `::ffff:0:0/96`, `::ffff:0:0:0/96` | Bypass attempts encoding IPv4 as IPv6 |
| **Multicast & Broadcast** | `224.0.0.0/4`, `ff00::/8`, `255.255.255.255/32` | Broadcast storms and multicast snooping |
| **Zero / Current Network** | `0.0.0.0/8` | Often resolves to localhost in Linux kernels |
| **Documentation & Test Nets** | `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` | Non-routable test networks |

*Note*: Decimal (`http://2130706433`), Octal (`http://0177.0.0.1`), and Hexadecimal (`http://0x7f000001`) encoded IP formats are automatically decoded and normalized to standard dotted-quad notation prior to CIDR evaluation.

### C. Layer 3: DNS Rebinding & TOCTOU Protection
In a DNS Rebinding attack, an attacker configures a DNS server for `attacker.com` with a short TTL (e.g., 0 or 1 second) that returns a benign public IP on first resolution, but an internal IP (`127.0.0.1` or `169.254.169.254`) on the second resolution.

**SiteScope Prevention Mechanism**:
- We implement a custom `lookup` function in the Node.js `http.Agent` and `https.Agent` used by Crawlee (`got-scraping`).
- The DNS lookup resolves the domain, validates the IP against the blocklist, and **pins the validated IP address to the TCP socket connection**.
- The HTTP request is dispatched directly to the pinned IP with the `Host` header set to the original domain name.
- Subsequent connections for redirects repeat the validation cycle afresh.

### D. Layer 4: Redirect Hop Enforcement
- Standard HTTP clients follow redirects automatically without re-validating the `Location` header destination. An external domain can easily return `HTTP 302 Location: http://169.254.169.254/latest/meta-data/`.
- **SiteScope Rule**: Automatic redirects are disabled in the raw client. Crawlee intercepts every `301`, `302`, `303`, `307`, and `308` status code.
- The destination URL is extracted, normalized, DNS-resolved, and verified against the IP blocklist before any socket is opened.
- Maximum redirect hops allowed per page request: **5**. If hop count exceeds 5, the crawl marks the URL as `REDIRECT_LIMIT_EXCEEDED`.

### E. Layer 5: Playwright Browser Isolation & Sandboxing
When Playwright is selectively triggered for SPA pages:
1. **Disabled Navigation**: Intercept `page.route('**/*', ...)` to validate all sub-resource requests. Block any sub-resource resolving to private or internal addresses.
2. **File Access Blocked**: Disallow `file://` protocol completely.
3. **No Credential Access**: Browser instances run in incognito context with no stored cookies, local storage, or session credentials.
4. **Context Destruction**: Incognito contexts are closed after each page crawl to destroy in-memory state.

---

## 4. Crawl Bounding & Resource Exhaustion Controls

To prevent Denial of Service (DoS) attacks against both SiteScope infrastructure and client target servers, the crawler enforces hard systemic boundaries:

| Control Parameter | Free Tier Limit | Pro Tier Limit | System Hard Max | Enforcement Level |
| :--- | :--- | :--- | :--- | :--- |
| **Max Pages Audited** | 50 pages | 1,000 pages | 1,000 pages | Crawlee queue stopper |
| **Max Crawl Depth** | 3 levels | 10 levels | 10 levels | URL tree depth tracker |
| **Max Concurrent Requests** | 2 requests | 5 requests | 5 requests | Crawlee pool concurrency |
| **Request Timeout** | 10,000 ms | 15,000 ms | 20,000 ms | Socket timeout |
| **Max Response Size** | 2 MB | 5 MB | 10 MB | Stream byte counter (abort on exceed) |
| **Max Job Execution Time** | 5 minutes | 30 minutes | 45 minutes | BullMQ job timeout |
| **Max Retries per Page** | 1 retry | 2 retries | 2 retries | Crawlee request handler |
| **Respect robots.txt** | Enforced | Enforced | Enforced | Standard RFC 9309 parser |

---

## 5. Security Audit Logging & Alerts

1. Any attempt to crawl an internal, private, loopback, or metadata address triggers an immediate `SECURITY_ALERT_SSRF_DETECTED` event.
2. The event is persisted in `admin_audit_logs` with:
   - User ID & Project ID.
   - Submitted target URL.
   - Resolved offending IP address.
   - Timestamp & Client IP.
3. The audit job is marked as `FAILED` with public-facing safe message: `"Invalid website URL: Destination cannot be resolved or accessed."` Internal IP details are **never** exposed to the end user.
