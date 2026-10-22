import { URL } from 'node:url';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export interface ValidatedTarget {
  isValid: boolean;
  normalizedUrl?: string;
  domain?: string;
  resolvedIps?: string[];
  pinnedIp?: string;
  error?: string;
}

const DISALLOWED_IPV4_RANGES = [
  'unspecified',
  'broadcast',
  'linkLocal',
  'loopback',
  'private',
  'carrierGradeNat',
];

const DISALLOWED_IPV6_RANGES = [
  'unspecified',
  'linkLocal',
  'loopback',
  'uniqueLocal',
  'ipv4Mapped',
  'rfc6145',
  'rfc6052',
  '6to4',
  'teredo',
];

export interface ValidateUrlOptions {
  allowLocalhost?: boolean;
}

export async function validateTargetUrl(
  rawUrl: string,
  options: ValidateUrlOptions = {}
): Promise<ValidatedTarget> {
  let parsed: URL;

  // Layer 1: Protocol & URL Normalization
  try {
    let sanitized = rawUrl.trim();
    // Only prepend https:// if no protocol scheme is specified at all
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(sanitized)) {
      sanitized = `https://${sanitized}`;
    }
    parsed = new URL(sanitized);
  } catch {
    return { isValid: false, error: 'Malformed or unparseable website URL.' };
  }

  // Scheme allowlist
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are permitted.' };
  }

  // Disallow credentials in URL
  if (parsed.username || parsed.password) {
    return { isValid: false, error: 'URLs containing embedded credentials are not allowed.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Handle localhost checking
  const isLocalhost =
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '127.0.0.1';

  if (isLocalhost && !options.allowLocalhost) {
    return { isValid: false, error: 'Localhost and local destinations are prohibited.' };
  }

  // Port restrictions
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    // If allowLocalhost is set (for automated testing fixtures), allow dynamic test ports
    const allowedPorts = options.allowLocalhost
      ? [80, 443, 8080, 8443, portNum]
      : [80, 443, 8080, 8443];

    if (!allowedPorts.includes(portNum)) {
      return { isValid: false, error: `Port ${portNum} is not permitted.` };
    }
  }

  // Layer 2: DNS Resolution & IP CIDR Evaluation
  let resolvedIps: string[] = [];

  // Check if hostname is already a raw IP literal
  if (ipaddr.isValid(hostname)) {
    resolvedIps = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      resolvedIps = records.map((r) => r.address);
    } catch {
      return { isValid: false, error: `DNS resolution failed for host: ${hostname}` };
    }
  }

  if (resolvedIps.length === 0) {
    return { isValid: false, error: `No IP addresses resolved for host: ${hostname}` };
  }

  // Evaluate EVERY resolved IP against blocked subnets
  for (const ipStr of resolvedIps) {
    try {
      const addr = ipaddr.parse(ipStr);
      const range = addr.range();

      if (options.allowLocalhost && (range === 'loopback' || ipStr === '127.0.0.1')) {
        // Allowed in test fixture
        continue;
      }

      if (addr.kind() === 'ipv4') {
        // Specific check for AWS/GCP/Azure link-local metadata 169.254.169.254
        if (ipStr.startsWith('169.254.') || range === 'linkLocal') {
          return {
            isValid: false,
            error: 'Target URL resolves to cloud metadata IP space.',
          };
        }

        if (DISALLOWED_IPV4_RANGES.includes(range)) {
          return {
            isValid: false,
            error: 'Target URL resolves to a disallowed private, loopback, or internal IP address.',
          };
        }
      } else if (addr.kind() === 'ipv6') {
        if (DISALLOWED_IPV6_RANGES.includes(range)) {
          return {
            isValid: false,
            error: 'Target URL resolves to a disallowed private or local IPv6 subnet.',
          };
        }
      }
    } catch {
      return { isValid: false, error: 'Invalid IP address encountered during resolution.' };
    }
  }

  // Clean normalized URL without tracking hashes
  parsed.hash = '';
  const normalizedUrl = parsed.toString();

  return {
    isValid: true,
    normalizedUrl,
    domain: hostname,
    resolvedIps,
    pinnedIp: resolvedIps[0],
  };
}
