import crypto from 'node:crypto';
import type { Pool } from 'pg';

export const SESSION_COOKIE = 'trade_session';

export interface AuthOwner { ownerId: string; displayName: string }

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

export async function getSessionOwner(pool: Pool, token: string | undefined): Promise<AuthOwner | null> {
  if (!token) return null;
  const result = await pool.query(`
    SELECT u.owner_id, u.display_name
    FROM sessions s
    JOIN users u ON u.owner_id = s.owner_id
    WHERE s.token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > CURRENT_TIMESTAMP
  `, [sha256(token)]);
  const row = result.rows[0];
  return row ? { ownerId: row.owner_id, displayName: row.display_name } : null;
}

export async function createSession(pool: Pool, ownerId: string, ttlMinutes = 480): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(`
    INSERT INTO sessions (session_id, owner_id, token_hash, expires_at)
    VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'))
  `, [ownerId, sha256(token), ttlMinutes]);
  return token;
}

export async function revokeSession(pool: Pool, token: string): Promise<void> {
  await pool.query(`
    UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP
    WHERE token_hash = $1 AND revoked_at IS NULL
  `, [sha256(token)]);
}

export function encryptSecret(value: string): string {
  const key = crypto.createHash('sha256').update(process.env.TRADE_MASTER_KEY ?? 'ephemeral-development-key-change-before-use').digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

export function decryptSecret(value: string): string {
  const [ivValue, tagValue, ciphertextValue] = value.split('.');
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error('Stored secret is malformed.');
  const key = crypto.createHash('sha256').update(process.env.TRADE_MASTER_KEY ?? 'ephemeral-development-key-change-before-use').digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64')), decipher.final()]).toString('utf8');
}

export function redactSensitiveText(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/(api[_ -]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
  if (Array.isArray(value)) return value.map(redactSensitiveText);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      /^(api[_-]?key|token|secret|password)$/i.test(key) ? '[REDACTED]' : redactSensitiveText(item)
    ]));
  }
  return value;
}
