# SiteScope — Server-Side Request Forgery (SSRF) Comprehensive Audit

**Audit Date**: October 2026  
**Auditor**: Senior Backend Security Engineer  
**Scope**: All outbound network requests, URL parsers, crawler engines, DNS resolution, and background workers in SiteScope.  

---

## 1. Outbound Request Inventory & Protection Status

| Component / File Path | Request Destination | Protocol | User Input Influence | Protection Status | Security Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `backend/src/routes/projects.ts` | Target website domain | HTTP / HTTPS | Direct user payload (`domain`) | **Protected** | Pre-flight 5-layer SSRF validation before DB persistence |
| `backend/src/routes/audits.ts` | Project `normalized_url` | HTTP / HTTPS | Read from database | **Protected** | Second pre-flight SSRF check before job enqueueing |
| `worker/src/crawlers/cheerio.ts` | Seed crawl URL | HTTP / HTTPS | Queued BullMQ job payload | **Protected** | Initial validation + origin bounding |
| `worker/src/crawlers/cheerio.ts` | Discovered internal links | HTTP / HTTPS | Discovered from HTML `<a>` tags | **Protected** | Link normalization, origin match, pre-enqueue SSRF validation |
| `worker/src/crawlers/cheerio.ts` | Pre-navigation crawl requests | HTTP / HTTPS | Crawlee request queue | **Protected** | `preNavigationHooks` validates destination and origin bounding |
| `worker/src/services/pagespeed.ts`| Google PageSpeed API (`googleapis.com`) | HTTPS | Fixed Google API endpoint; passes user URL as query param | **Protected** | Hardcoded HTTPS API host; 20s timeout; lab fallback |
| `worker/src/services/notifications.ts`| Resend API (`api.resend.com`) | HTTPS | Fixed SDK endpoint | **Protected** | Hardcoded Resend endpoint; development simulation mode |
| `backend/src/services/billing.ts`| Razorpay API (`api.razorpay.com`) | HTTPS | Fixed SDK endpoint | **Protected** | Hardcoded Razorpay gateway endpoint |
| `backend/src/services/supabase.ts`| Supabase REST / PostgreSQL | HTTPS / TCP | Fixed environment variable (`SUPABASE_URL`) | **Protected** | Admin service role client with HTTPS encryption |

---

## 2. Attack Vectors Evaluated & Hardened

### A. Non-Canonical IP Literal Representations
- **Attack Scenario**: Adversaries submit alternate IP representations such as integer dwords (`http://2130706433/` for `127.0.0.1`), hexadecimal (`http://0x7f000001/`), octal notation (`http://0177.0.0.1/`), or zero-omitted forms (`http://127.1/`).
- **Audit Finding**: While Node.js's WHATWG `URL` parser normalizes integer and hex representations into standard dotted-decimal form (`127.0.0.1`), passing raw IPv6 bracket literals (`[::1]`) caused `ipaddr.isValid` to evaluate to `false`, potentially skipping IP checks.
- **Mitigation Implemented**: Added explicit regex bracket stripping (`cleanHostname = rawHostname.replace(/^\[|\]$/g, '')`) before calling `ipaddr.isValid`. Tested and verified.

### B. IPv4-Mapped IPv6 Addresses
- **Attack Scenario**: Attacker bypasses naive IPv4 filters by using IPv6 notation representing internal IPv4 addresses, such as `http://[::ffff:127.0.0.1]/` or `http://[::ffff:169.254.169.254]/`.
- **Audit Finding**: When parsed as IPv6, subnets might evade IPv4 link-local checks if not explicitly unwrapped.
- **Mitigation Implemented**: The core validator inspects `addr.isIPv4MappedAddress()` and converts it to its canonical IPv4 representation (`addr.toIPv4Address()`), recursively running it through all IPv4 private, loopback, and metadata rules. Tested and verified.

### C. Cloud Metadata IP & Hostname Exposure
- **Attack Scenario**: An attacker on AWS, GCP, Azure, Oracle Cloud, or Alibaba Cloud attempts to steal IAM role credentials or kubelet tokens by requesting metadata endpoints.
  - AWS/GCP/Azure/DigitalOcean: `http://169.254.169.254/latest/meta-data/`
  - AWS IPv6 Metadata: `http://[fd00:ec2::254]/`
  - Alibaba Cloud: `http://100.100.100.200/`
  - GCP Metadata Hostnames: `http://metadata.google.internal/`
  - AWS Instance Data: `http://instance-data/`
- **Mitigation Implemented**: Added explicit blacklist sets for `CLOUD_METADATA_IPS` and `PROHIBITED_HOSTNAMES`, and blocked the entire `169.254.0.0/16` link-local CIDR block and `fd00::/8` unique-local subnets. Tested and verified.

### D. Time-of-Check to Time-of-Use (TOCTOU) & DNS Rebinding
- **Attack Scenario**: The attacker configures a DNS server for `evil.com` with a 0-second TTL. The first DNS lookup during pre-flight validation returns a public IP (`93.184.216.34`), which passes the SSRF check. A fraction of a second later, when the HTTP client initiates the TCP connection, the DNS server rebinds to `127.0.0.1` or `169.254.169.254`.
- **Mitigation Implemented**: Created `createSsrfLookup()` and `createSsrfAgents()` in `@sitescope/shared`. This provides a custom DNS resolver callback for Node.js `http.Agent` and `https.Agent` that executes the SSRF check at connection time immediately before the socket is created.

### E. Public-to-Private Redirect Bypasses
- **Attack Scenario**: A crawler begins on a valid public domain `https://example.com`, but the server responds with an HTTP 301/302 redirect pointing to `http://169.254.169.254/latest/meta-data/`.
- **Mitigation Implemented**:
  1. Origin-bounding strictly blocks any request whose origin does not match the target project origin.
  2. Crawlee pre-navigation hooks evaluate every hop before the request is dispatched.
  3. URL length and 10MB response body ceilings prevent decompression bombs.

---

## 3. Port & Protocol Policy

| Protocol / Port | Permitted? | Justification |
| :--- | :--- | :--- |
| **HTTP (Port 80)** | **Yes** | Standard public web traffic |
| **HTTPS (Port 443)** | **Yes** | Standard encrypted web traffic |
| **HTTP Alt (Port 8080)** | **Yes** | Common web application testing port |
| **HTTPS Alt (Port 8443)** | **Yes** | Common secure web application testing port |
| **All Other Ports (e.g. 22, 25, 6379, 5432, 27017)** | ❌ **Blocked** | Database, internal service, and administration ports are prohibited |

---

## 4. Remaining Residual Risks & Infrastructure Mitigations

1. **Operating System DNS Caching**: Some platforms cache negative or short-TTL DNS lookups outside Node.js. Running crawlers with egress network firewalls (e.g., AWS Security Groups / VPC egress rules denying `169.254.169.254` and RFC 1918 subnets) provides defense-in-depth.
2. **Chromium / Playwright Headless Automation**: When Playwright is used for JavaScript-heavy SPA rendering, the browser context must run behind an egress proxy or use network interception (`page.route('**/*', ...)`) to inspect subresources, iframes, and WebSockets.
