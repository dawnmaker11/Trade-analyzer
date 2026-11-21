import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required. Set it to the local PostgreSQL database.');
  process.exit(2);
}

const migrationsDir = path.resolve('db/migrations');
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Migration failed: ${file}`);
    throw error;
  }
}

await client.end();
console.log('Migrations completed.');
