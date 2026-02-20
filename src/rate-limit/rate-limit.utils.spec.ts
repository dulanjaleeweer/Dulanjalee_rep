import {
  normalizeIp,
  isIpInCidr,
  isTrustedProxy,
  hashEmail,
  buildRateLimitKey,
  extractTenantId,
  extractUserId,
  extractBodyValue,
} from './rate-limit.utils';
import { RateLimitKeyComponents } from './rate-limit.interfaces';

// Mock Express Request
type MockRequest = {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
  body?: Record<string, unknown>;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
  user?: { id?: string; sub?: string };
};

describe('RateLimitUtils', () => {
  describe('normalizeIp', () => {
    it('should return IPv4 as-is', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
      expect(normalizeIp('10.0.0.1')).toBe('10.0.0.1');
    });

    it('should convert IPv4-mapped IPv6 to IPv4', () => {
      expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
      expect(normalizeIp('::FFFF:10.0.0.1')).toBe('10.0.0.1');
    });

    it('should return unknown for undefined', () => {
      expect(normalizeIp(undefined)).toBe('unknown');
    });

    it('should return unknown for empty string', () => {
      expect(normalizeIp('')).toBe('unknown');
    });

    it('should normalize standard IPv6', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    });

    it('should trim whitespace', () => {
      expect(normalizeIp('  192.168.1.1  ')).toBe('192.168.1.1');
    });
  });

  describe('isIpInCidr', () => {
    it('should match IP in CIDR range', () => {
      expect(isIpInCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
      expect(isIpInCidr('10.0.5.1', '10.0.0.0/8')).toBe(true);
    });

    it('should not match IP outside CIDR range', () => {
      expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
      expect(isIpInCidr('172.16.0.1', '10.0.0.0/8')).toBe(false);
    });

    it('should handle exact match', () => {
      expect(isIpInCidr('192.168.1.1', '192.168.1.1/32')).toBe(true);
    });

    it('should return false for invalid CIDR', () => {
      expect(isIpInCidr('192.168.1.1', 'invalid')).toBe(false);
    });
  });

  describe('isTrustedProxy', () => {
    it('should return true for exact match', () => {
      expect(isTrustedProxy('192.168.1.1', ['192.168.1.1'])).toBe(true);
    });

    it('should return true for CIDR match', () => {
      expect(isTrustedProxy('192.168.1.50', ['192.168.1.0/24'])).toBe(true);
    });

    it('should return false for non-matching IP', () => {
      expect(isTrustedProxy('192.168.2.1', ['192.168.1.0/24'])).toBe(false);
    });

    it('should return false for empty trusted list', () => {
      expect(isTrustedProxy('192.168.1.1', [])).toBe(false);
    });

    it('should return false for undefined IP', () => {
      expect(isTrustedProxy(undefined, ['192.168.1.1'])).toBe(false);
    });
  });

  describe('hashEmail', () => {
    it('should hash email consistently', () => {
      const hash1 = hashEmail('test@example.com');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should normalize email before hashing', () => {
      const hash1 = hashEmail('Test@Example.COM');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should trim whitespace', () => {
      const hash1 = hashEmail('  test@example.com  ');
      const hash2 = hashEmail('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('should return undefined for undefined input', () => {
      expect(hashEmail(undefined)).toBeUndefined();
    });

    it('should return 16 character hash', () => {
      const hash = hashEmail('test@example.com');
      expect(hash).toHaveLength(16);
    });
  });

  describe('buildRateLimitKey', () => {
    it('should build login IP key', () => {
      const components: RateLimitKeyComponents = {
        type: 'login',
        ip: '192.168.1.1',
      };
      expect(buildRateLimitKey(components)).toBe('rl:auth:login:ip:192.168.1.1');
    });

    it('should build login key with tenant', () => {
      const components: RateLimitKeyComponents = {
        type: 'login',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
      };
      expect(buildRateLimitKey(components)).toBe('rl:auth:login:tenant:tenant-123:ip:192.168.1.1');
    });

    it('should build login email key', () => {
      const components: RateLimitKeyComponents = {
        type: 'loginEmail',
        tenantId: 'tenant-123',
        ip: '192.168.1.1',
        emailHash: 'abc123',
      };
      expect(buildRateLimitKey(components)).toBe('rl:auth:login:tenant:tenant-123:email:abc123');
    });

    it('should build sensitive endpoint key with user', () => {
      const components: RateLimitKeyComponents = {
        type: 'sensitive',
        tenantId: 'tenant-123',
        userId: 'user-456',
        ip: '192.168.1.1',
      };
      expect(buildRateLimitKey(components)).toBe(
        'rl:api:sensitive:tenant:tenant-123:user:user-456',
      );
    });

    it('should build public key without tenant', () => {
      const components: RateLimitKeyComponents = {
        type: 'public',
        ip: '192.168.1.1',
      };
      expect(buildRateLimitKey(components)).toBe('rl:api:public:ip:192.168.1.1');
    });

    it('should build custom key', () => {
      const components: RateLimitKeyComponents = {
        type: 'custom',
        customSuffix: 'my-feature',
        ip: '192.168.1.1',
      };
      expect(buildRateLimitKey(components)).toBe('rl:custom:my-feature:192.168.1.1');
    });
  });

  describe('extractTenantId', () => {
    it('should extract from header', () => {
      const req = {
        headers: { 'x-tenant-id': 'tenant-123' },
        query: {},
      } as unknown as MockRequest;
      expect(extractTenantId(req as never)).toBe('tenant-123');
    });

    it('should extract from query param', () => {
      const req = {
        headers: {},
        query: { tenantId: 'tenant-456' },
      } as unknown as MockRequest;
      expect(extractTenantId(req as never)).toBe('tenant-456');
    });

    it('should extract from tenant query param', () => {
      const req = {
        headers: {},
        query: { tenant: 'tenant-789' },
      } as unknown as MockRequest;
      expect(extractTenantId(req as never)).toBe('tenant-789');
    });

    it('should prefer header over query', () => {
      const req = {
        headers: { 'x-tenant-id': 'header-tenant' },
        query: { tenantId: 'query-tenant' },
      } as unknown as MockRequest;
      expect(extractTenantId(req as never)).toBe('header-tenant');
    });

    it('should return undefined when not present', () => {
      const req = { headers: {}, query: {} } as unknown as MockRequest;
      expect(extractTenantId(req as never)).toBeUndefined();
    });
  });

  describe('extractUserId', () => {
    it('should extract from req.user.id', () => {
      const req = { user: { id: 'user-123' } } as unknown as MockRequest;
      expect(extractUserId(req as never)).toBe('user-123');
    });

    it('should extract from req.user.sub', () => {
      const req = { user: { sub: 'user-456' } } as unknown as MockRequest;
      expect(extractUserId(req as never)).toBe('user-456');
    });

    it('should prefer id over sub', () => {
      const req = { user: { id: 'id-value', sub: 'sub-value' } } as unknown as MockRequest;
      expect(extractUserId(req as never)).toBe('id-value');
    });

    it('should return undefined when no user', () => {
      const req = {} as unknown as MockRequest;
      expect(extractUserId(req as never)).toBeUndefined();
    });

    it('should return undefined when user has no id', () => {
      const req = { user: {} } as unknown as MockRequest;
      expect(extractUserId(req as never)).toBeUndefined();
    });
  });

  describe('extractBodyValue', () => {
    it('should extract value from body', () => {
      const req = { body: { email: 'test@example.com' } };
      expect(extractBodyValue(req as never, 'email')).toBe('test@example.com');
    });

    it('should return undefined for missing field', () => {
      const req = { body: { other: 'value' } };
      expect(extractBodyValue(req as never, 'email')).toBeUndefined();
    });

    it('should return undefined for non-string value', () => {
      const req = { body: { count: 123 } };
      expect(extractBodyValue(req as never, 'count')).toBeUndefined();
    });

    it('should return undefined when no body', () => {
      const req = {};
      expect(extractBodyValue(req as never, 'email')).toBeUndefined();
    });
  });
});
