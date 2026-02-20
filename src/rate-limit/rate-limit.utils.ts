import { createHash } from 'crypto';
import { Request } from 'express';
import { RateLimitKeyComponents, IpExtractionConfig } from './rate-limit.interfaces';
import { RATE_LIMIT_KEY_PREFIXES } from './rate-limit.constants';

/**
 * Normalize an IP address
 * - Handles IPv4-mapped IPv6 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
 * - Compresses IPv6 to canonical form
 * - Returns 'unknown' if IP cannot be determined
 */
export function normalizeIp(ip: string | undefined): string {
  if (!ip) {
    return 'unknown';
  }

  // Trim whitespace
  let normalized = ip.trim();

  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  const ipv4MappedPrefix = '::ffff:';
  if (normalized.toLowerCase().startsWith(ipv4MappedPrefix)) {
    const ipv4Part = normalized.slice(ipv4MappedPrefix.length);
    if (isValidIpv4(ipv4Part)) {
      return ipv4Part;
    }
  }

  // If it's IPv4, return as-is
  if (isValidIpv4(normalized)) {
    return normalized;
  }

  // Try to normalize IPv6
  try {
    normalized = normalizeIpv6(normalized);
    return normalized;
  } catch {
    // If normalization fails, return original or 'unknown'
    return normalized || 'unknown';
  }
}

/**
 * Check if string is valid IPv4
 */
function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
  });
}

/**
 * Normalize IPv6 address to compressed form
 */
function normalizeIpv6(ip: string): string {
  // Handle zone indices (e.g., fe80::1%eth0)
  const zoneIndex = ip.indexOf('%');
  const ipWithoutZone = zoneIndex !== -1 ? ip.slice(0, zoneIndex) : ip;

  // Split into groups
  const parts = ipWithoutZone.split(':');

  // Handle :: compression
  const emptyIndex = parts.findIndex((p) => p === '');
  if (emptyIndex !== -1) {
    // Count non-empty parts
    const nonEmptyCount = parts.filter((p) => p !== '').length;
    // Fill in zeros
    const zerosNeeded = 8 - nonEmptyCount;
    const zeros = Array(zerosNeeded).fill('0');
    const before = parts.slice(0, emptyIndex).filter((p) => p !== '');
    const after = parts.slice(emptyIndex + 1).filter((p) => p !== '');
    const allParts = [...before, ...zeros, ...after];
    return allParts.map((p) => p.padStart(4, '0')).join(':');
  }

  // No compression, just pad each group
  if (parts.length === 8) {
    return parts.map((p) => p.padStart(4, '0')).join(':');
  }

  // Invalid IPv6
  throw new Error('Invalid IPv6 address');
}

/**
 * Check if an IP is in a CIDR range
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (!rangeIp || isNaN(prefix)) {
    return false;
  }

  // For IPv4
  if (isValidIpv4(ip) && isValidIpv4(rangeIp)) {
    return isIpv4InCidr(ip, rangeIp, prefix);
  }

  // For IPv6 (simplified check)
  return ip === rangeIp;
}

/**
 * Check if IPv4 is in CIDR range
 */
function isIpv4InCidr(ip: string, rangeIp: string, prefix: number): boolean {
  const ipNum = ipv4ToNumber(ip);
  const rangeNum = ipv4ToNumber(rangeIp);
  const mask = 0xffffffff << (32 - prefix);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IPv4 to number
 */
function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if IP is in list of trusted proxies
 */
export function isTrustedProxy(ip: string | undefined, trustedProxies: string[]): boolean {
  if (!ip || trustedProxies.length === 0) {
    return false;
  }

  const normalizedIp = normalizeIp(ip);

  return trustedProxies.some((trusted) => {
    // Exact match
    if (trusted === normalizedIp) return true;
    // CIDR match
    if (trusted.includes('/')) {
      return isIpInCidr(normalizedIp, trusted);
    }
    return false;
  });
}

/**
 * Extract client IP from request
 * Supports X-Forwarded-For with trusted proxy validation
 */
export function extractClientIp(req: Request, config: IpExtractionConfig): string {
  const remoteAddress = req.socket?.remoteAddress || req.connection?.remoteAddress;

  // If no trusted proxies configured, use direct connection
  if (!config.trustProxy || config.trustedProxies.length === 0) {
    return normalizeIp(remoteAddress);
  }

  // Check if direct connection is from a trusted proxy
  if (!isTrustedProxy(remoteAddress, config.trustedProxies)) {
    return normalizeIp(remoteAddress);
  }

  // Parse X-Forwarded-For header
  const forwardedHeader = req.headers['x-forwarded-for'];
  if (!forwardedHeader) {
    // Fall back to X-Real-IP
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return normalizeIp(realIp);
    }
    return normalizeIp(remoteAddress);
  }

  // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
  const ips = forwardedHeader
    .toString()
    .split(',')
    .map((ip) => ip.trim());

  // Find the first untrusted IP (the actual client)
  // Walk from right (closest to server) to left
  for (let i = ips.length - 1; i >= 0; i--) {
    const ip = ips[i];

    // If this IP is not trusted, it's the client
    if (!isTrustedProxy(ip, config.trustedProxies)) {
      return normalizeIp(ip);
    }

    // If this is a trusted proxy and it's the leftmost, it's the client
    if (i === 0) {
      return normalizeIp(ip);
    }
  }

  return normalizeIp(remoteAddress);
}

/**
 * Hash email for use in rate limit keys
 * Uses SHA-256 and returns first 16 chars for reasonable collision resistance
 */
export function hashEmail(email: string | undefined): string | undefined {
  if (!email) {
    return undefined;
  }

  const normalized = email.toLowerCase().trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

/**
 * Build Redis key for rate limiting
 */
export function buildRateLimitKey(components: RateLimitKeyComponents): string {
  const { type, tenantId, userId, ip, emailHash, customSuffix } = components;

  const parts: string[] = [];

  // Add prefix based on type
  switch (type) {
    case 'login':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_LOGIN, 'ip');
      break;
    case 'loginEmail':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_LOGIN, 'email');
      break;
    case 'passwordReset':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_PASSWORD_RESET, 'req', 'ip');
      break;
    case 'passwordResetConfirm':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_PASSWORD_RESET, 'confirm', 'ip');
      break;
    case 'emailVerifyResend':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_EMAIL_VERIFY, 'resend', 'ip');
      break;
    case 'emailVerifyToken':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_EMAIL_VERIFY, 'token', 'ip');
      break;
    case 'refreshToken':
      parts.push(RATE_LIMIT_KEY_PREFIXES.AUTH_REFRESH, 'user');
      break;
    case 'public':
      parts.push(RATE_LIMIT_KEY_PREFIXES.API_PUBLIC, 'ip');
      break;
    case 'sensitive':
      parts.push(RATE_LIMIT_KEY_PREFIXES.API_SENSITIVE, 'user');
      break;
    case 'custom':
      parts.push(RATE_LIMIT_KEY_PREFIXES.CUSTOM, customSuffix || 'default');
      break;
    default:
      parts.push(RATE_LIMIT_KEY_PREFIXES.CUSTOM, 'unknown');
  }

  // Add tenant if present (for multi-tenant separation)
  if (tenantId && type !== 'public' && type !== 'custom') {
    parts.splice(1, 0, `tenant:${tenantId}`);
  }

  // Add identifier (IP, user ID, or email hash)
  if (userId && (type === 'refreshToken' || type === 'sensitive')) {
    parts.push(userId);
  } else if (emailHash && (type === 'loginEmail' || type === 'emailVerifyResend')) {
    parts.push(emailHash);
  } else {
    parts.push(ip);
  }

  return parts.join(':');
}

/**
 * Safely extract value from request body
 */
export function extractBodyValue(req: Request, field: string): string | undefined {
  if (req.body && typeof req.body === 'object') {
    const value = req.body[field];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * Safely extract tenant ID from request
 */
export function extractTenantId(req: Request): string | undefined {
  // Priority: header, then query param
  const headerValue = req.headers['x-tenant-id'];
  if (typeof headerValue === 'string') {
    return headerValue;
  }

  const queryValue = req.query['tenantId'] || req.query['tenant'];
  if (typeof queryValue === 'string') {
    return queryValue;
  }

  return undefined;
}

/**
 * Safely extract user ID from request
 * Assumes JWT auth middleware has set req.user
 */
export function extractUserId(req: Request): string | undefined {
  const user = (req as unknown as Record<string, unknown>).user;
  if (user && typeof user === 'object') {
    const id = (user as Record<string, unknown>).id || (user as Record<string, unknown>).sub;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}
