import { describe, expect, it } from 'vitest';
import { createPasswordHash, sha256, verifyPassword } from '../src/auth.js';

describe('Epic 2 password and session primitives', () => {
  it('creates and verifies password hashes', () => {
    const password = 'local-owner-test';
    const { salt, hash } = createPasswordHash(password);
    expect(verifyPassword(password, salt, hash)).toBe(true);
    expect(verifyPassword('wrong-password', salt, hash)).toBe(false);
  });

  it('hashes opaque session tokens irreversibly for storage', () => {
    const token = 'opaque-session-token';
    expect(sha256(token)).not.toBe(token);
    expect(sha256(token)).toHaveLength(64);
  });
});
