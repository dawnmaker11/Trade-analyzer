import crypto from 'node:crypto';
import { stdin as input, stdout as output } from 'node:process';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5433/trade';
const host = new URL(databaseUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error('For safety, the reset command permits only a loopback PostgreSQL database.');

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!input.isTTY) { reject(new Error('Run this command in an interactive terminal.')); return; }
    let value = '';
    output.write(prompt);
    input.setRawMode(true); input.resume(); input.setEncoding('utf8');
    const finish = () => { input.setRawMode(false); input.pause(); input.removeListener('data', onData); output.write('\n'); resolve(value); };
    const onData = (chunk) => {
      if (chunk === '\u0003') { input.setRawMode(false); input.pause(); input.removeListener('data', onData); reject(new Error('Password reset cancelled.')); }
      else if (chunk === '\r' || chunk === '\n') finish();
      else if (chunk === '\u007f' || chunk === '\b') { if (value) { value = value.slice(0, -1); output.write('\b \b'); } }
      else if (!/[^\x20-\x7e]/.test(chunk)) { value += chunk; output.write('•'); }
    };
    input.on('data', onData);
  });
}

const password = await readHidden('New local owner password (12+ characters): ');
const confirmation = await readHidden('Confirm new local owner password: ');
if (password.length < 12) throw new Error('Choose at least 12 characters.');
if (password !== confirmation) throw new Error('Passwords do not match.');

const pool = new pg.Pool({ connectionString: databaseUrl });
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owners = await client.query('SELECT owner_id,display_name FROM users FOR UPDATE');
    if (owners.rowCount !== 1) throw new Error(`Expected exactly one local owner, found ${owners.rowCount ?? 0}. No password was changed.`);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
    await client.query('UPDATE users SET password_salt=$2,password_hash=$3,updated_at=CURRENT_TIMESTAMP WHERE owner_id=$1', [owners.rows[0].owner_id, salt, hash]);
    await client.query('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE owner_id=$1 AND revoked_at IS NULL', [owners.rows[0].owner_id]);
    await client.query('COMMIT');
    output.write(`Password reset for local owner ${owners.rows[0].display_name}. Existing sessions were signed out.\n`);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
} finally { await pool.end(); }
