import { URL } from 'node:url';
import dns from 'node:dns/promises';
import dnsCb from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';

export interface ValidatedTarget {
  isValid: boolean;
  normalizedUrl?: string;
  domain?: string;
  resolvedIps?: string[];
  pinnedIp?: string;
  error?: string;
}

export interface ValidateUrlOptions {
  allowLocalhost?: boolean;
  allowedPorts?: number[];
  maxUrlLength?: number;
}

const DEFAULT_ALLOWED_PORTS = [80, 443, 8080, 8443];
const DEFAULT_MAX_URL_LENGTH = 2048;

// Blocked IPv4 ranges per RFC standards
const DISALLOWED_IPV4_RANGES = [
  'unspecified',         // 0.0.0.0/8
  'broadcast',           // 255.255.255.255/32
  'linkLocal',           // 169.254.0.0/16
  'loopback',            // 127.0.0.0/8
  'private',             // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  'carrierGradeNat',     // 100.64.0.0/10
];

// Blocked IPv6 ranges per RFC standards
const DISALLOWED_IPV6_RANGES = [
  'unspecified',         // ::/128
  'linkLocal',           // fe80::/10
  'loopback',            // ::1/128
  'uniqueLocal',         // fc00::/7 (fd00::/8 private IPv6)
  'ipv4Mapped',          // ::ffff:0:0/96
  'rfc6145',             // ::ffff:0:0:0/96
  'rfc6052',             // 64:ff9b::/96
  '6to4',                // 2002::/16
  'teredo',              // 2001::/32
  'discard',             // 100::/64
];

// Known cloud metadata IP addresses & hostnames across AWS, GCP, Azure, Oracle, Alibaba
const CLOUD_METADATA_IPS = new Set([
  '169.254.169.254',     // AWS, GCP, Azure, Oracle, DigitalOcean
  '169.254.169.253',     // AWS internal DNS
  '100.100.100.200',     // Alibaba Cloud metadata
  'fd00:ec2::254',       // AWS IPv6 metadata
]);

const PROHIBITED_HOSTNAMES = new Set([
  'localhost',
  'instance-data',
  'metadata.google.internal',
  'metadata.goog',
]);

const PROHIBITED_DOMAIN_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.corp',
  '.lan',
  '.home',
  '.home.arpa',
];

/**
 * Evaluates whether an individual IP string falls into a private, loopback, or metadata subnet.
 */
export function isIpAddressDisallowed(
  rawIp: string,
  options: { allowLocalhost?: boolean } = {}
): { disallowed: boolean; reason?: string } {
  // Strip brackets if IPv6 literal with brackets
  const cleanIp = rawIp.replace(/^\[|\]$/g, '').trim();

  // Explicit cloud metadata check
  if (CLOUD_METADATA_IPS.has(cleanIp) || cleanIp.startsWith('169.254.')) {
    return { disallowed: true, reason: 'Target resolves to cloud metadata IP space (169.254.169.254 / fd00:ec2::254).' };
  }

  try {
    if (!ipaddr.isValid(cleanIp)) {
      return { disallowed: true, reason: `Invalid IP address format: ${cleanIp}` };
    }

    const addr = ipaddr.parse(cleanIp);

    // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1, ::ffff:169.254.169.254)
    if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      const ipv4 = (addr as ipaddr.IPv6).toIPv4Address();
      return isIpAddressDisallowed(ipv4.toString(), options);
    }

    if (addr.kind() === 'ipv4') {
      const ipv4 = addr as ipaddr.IPv4;
      const range = ipv4.range();

      if (options.allowLocalhost && (range === 'loopback' || cleanIp === '127.0.0.1')) {
        return { disallowed: false };
      }

      if (cleanIp.startsWith('169.254.') || range === 'linkLocal') {
        return { disallowed: true, reason: 'Target resolves to link-local / cloud metadata space.' };
      }

      if (DISALLOWED_IPV4_RANGES.includes(range)) {
        return {
          disallowed: true,
          reason: `Target resolves to a disallowed private, loopback, or internal IP address (${range}: ${cleanIp}).`,
        };
      }
    } else if (addr.kind() === 'ipv6') {
      const ipv6 = addr as ipaddr.IPv6;
      const range = ipv6.range();

      if (options.allowLocalhost && (range === 'loopback' || cleanIp === '::1')) {
        return { disallowed: false };
      }

      if (DISALLOWED_IPV6_RANGES.includes(range)) {
        return {
          disallowed: true,
          reason: `Target resolves to a disallowed private or local IPv6 subnet (${range}: ${cleanIp}).`,
        };
      }
    }

    return { disallowed: false };
  } catch {
    return { disallowed: true, reason: `Failed to evaluate IP address safety: ${cleanIp}` };
  }
}

/**
 * 5-Layer SSRF Validator for outbound URLs.
 */
export async function validateTargetUrl(
  rawUrl: string,
  options: ValidateUrlOptions = {}
): Promise<ValidatedTarget> {
  const maxUrlLength = options.maxUrlLength || DEFAULT_MAX_URL_LENGTH;

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Target URL is missing or empty.' };
  }

  const trimmed = rawUrl.trim();

  // Layer 0: Length limit
  if (trimmed.length > maxUrlLength) {
    return {
      isValid: false,
      error: `URL exceeds maximum permitted length of ${maxUrlLength} characters.`,
    };
  }

  // Layer 1: Protocol & URL Normalization
  let parsed: URL;
  try {
    let sanitized = trimmed;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(sanitized)) {
      sanitized = `https://${sanitized}`;
    }
    parsed = new URL(sanitized);
  } catch {
    return { isValid: false, error: 'Malformed or unparseable website URL.' };
  }

  // Scheme allowlist
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: `Protocol "${parsed.protocol}" is not permitted. Only HTTP and HTTPS are allowed.` };
  }

  // Disallow credentials in URL
  if (parsed.username || parsed.password) {
    return { isValid: false, error: 'URLs containing embedded credentials are prohibited.' };
  }

  // Clean raw hostname (strip IPv6 brackets if present)
  const rawHostname = parsed.hostname.toLowerCase();
  const cleanHostname = rawHostname.replace(/^\[|\]$/g, '');

  if (!cleanHostname) {
    return { isValid: false, error: 'URL contains an empty hostname.' };
  }

  // Layer 2: Hostname-level checks
  const isLocalhost =
    cleanHostname === 'localhost' ||
    cleanHostname === '127.0.0.1' ||
    cleanHostname === '::1' ||
    PROHIBITED_HOSTNAMES.has(cleanHostname) ||
    PROHIBITED_DOMAIN_SUFFIXES.some((suffix) => cleanHostname.endsWith(suffix));

  if (isLocalhost && !options.allowLocalhost) {
    return { isValid: false, error: `Destination "${cleanHostname}" is a prohibited local or internal destination.` };
  }

  // Layer 3: Port restrictions
  const allowedPorts = options.allowedPorts || DEFAULT_ALLOWED_PORTS;
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    // Allow dynamic fixture ports in local tests if allowLocalhost is set
    const effectiveAllowed = options.allowLocalhost ? [...allowedPorts, portNum] : allowedPorts;

    if (isNaN(portNum) || !effectiveAllowed.includes(portNum)) {
      return { isValid: false, error: `Port ${parsed.port} is not permitted. Permitted ports: ${allowedPorts.join(', ')}.` };
    }
  }

  // Layer 4: DNS Resolution & IP Evaluation
  let resolvedIps: string[] = [];

  // Check if hostname is already a raw IP literal (IPv4 or IPv6)
  if (ipaddr.isValid(cleanHostname)) {
    resolvedIps = [cleanHostname];
  } else {
    try {
      const records = await dns.lookup(cleanHostname, { all: true });
      resolvedIps = records.map((r) => r.address);
    } catch {
      return { isValid: false, error: `DNS resolution failed for host: ${cleanHostname}` };
    }
  }

  if (resolvedIps.length === 0) {
    return { isValid: false, error: `No IP addresses resolved for host: ${cleanHostname}` };
  }

  // Evaluate EVERY resolved IP
  for (const ip of resolvedIps) {
    const ipCheck = isIpAddressDisallowed(ip, { allowLocalhost: options.allowLocalhost });
    if (ipCheck.disallowed) {
      return {
        isValid: false,
        error: ipCheck.reason || `Disallowed IP address: ${ip}`,
      };
    }
  }

  // Clean normalized URL without fragment hashes
  parsed.hash = '';
  const normalizedUrl = parsed.toString();

  return {
    isValid: true,
    normalizedUrl,
    domain: cleanHostname,
    resolvedIps,
    pinnedIp: resolvedIps[0],
  };
}

/**
 * Creates a custom DNS lookup callback for http.Agent and https.Agent that
 * verifies IP destinations at connection time, protecting against DNS rebinding (TOCTOU).
 */
export function createSsrfLookup(options: ValidateUrlOptions = {}) {
  return function ssrfLookup(
    hostname: string,
    opts: any,
    callback: (err: Error | null, address?: any, family?: number) => void
  ) {
    const cleanHost = hostname.replace(/^\[|\]$/g, '').toLowerCase();

    // Hostname check
    if (
      !options.allowLocalhost &&
      (cleanHost === 'localhost' ||
        PROHIBITED_HOSTNAMES.has(cleanHost) ||
        PROHIBITED_DOMAIN_SUFFIXES.some((s) => cleanHost.endsWith(s)))
    ) {
      return callback(new Error(`SSRF Blocked: Prohibited hostname ${hostname}`));
    }

    dnsCb.lookup(cleanHost, { all: true }, (err, addresses) => {
      if (err) return callback(err);

      for (const record of addresses) {
        const check = isIpAddressDisallowed(record.address, { allowLocalhost: options.allowLocalhost });
        if (check.disallowed) {
          return callback(
            new Error(`SSRF Blocked: Destination ${hostname} resolved to disallowed IP ${record.address}`)
          );
        }
      }

      if (opts?.all) {
        callback(null, addresses as any);
      } else {
        const primary = addresses[0];
        callback(null, primary.address, primary.family);
      }
    });
  };
}

/**
 * Returns HTTP and HTTPS agents configured with connection-time SSRF DNS rebinding prevention.
 */
export function createSsrfAgents(options: ValidateUrlOptions = {}) {
  const lookup = createSsrfLookup(options);

  const httpAgent = new http.Agent({
    keepAlive: false,
    maxSockets: 10,
    timeout: 15000,
    lookup,
  });

  const httpsAgent = new https.Agent({
    keepAlive: false,
    maxSockets: 10,
    timeout: 15000,
    lookup,
  });

  return { httpAgent, httpsAgent };
}
