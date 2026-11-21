import { loadConfig } from '../../../packages/contracts/src/config.js';

try { process.loadEnvFile('.env'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }

const config = loadConfig(process.env);
console.log(JSON.stringify({ service: 'trade-worker', status: 'started', mode: config.mode, timezone: config.exchangeTimezone }));

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
