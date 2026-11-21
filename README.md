# Trade

Private Indian equities and index-options research application, starting with a Windows-local Phase A implementation.

The approved scope and architecture are in `docs/Trade-Architecture-and-Execution-Backlog-local.md`.

## Runtime baseline

- Node.js 20 LTS or newer
- npm 10 or newer
- Git
- PostgreSQL 17 or a compatible supported PostgreSQL release
- Windows PowerShell

## Setup

```powershell
npm ci
npm run check
npm test
npm run build
```

Run the prerequisites check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prerequisites.ps1
```

Create a local database role/database, then set `DATABASE_URL` and apply migrations:

```powershell
$env:DATABASE_URL='postgresql://trade_app@127.0.0.1:5432/trade'
npm run migrate
```

The migration directory is ordered and repeat-safe. Job rows use atomic claims, leases, retry limits, and idempotent completion handlers.

## Local startup

```powershell
npm start
npm run status
npm run stop
```

For development, prefer VS Code integrated terminals: use **Terminal → Run Task → Trade: Start in VS Code terminals**. This starts API, web, and worker in visible VS Code terminals. The web task is pinned to port 5173 with strict-port mode, so it reports a port conflict instead of silently choosing 5174+.

Use `http://localhost:3001` for the web app and `http://localhost:3000` for the API. Keep the hostname consistent: `localhost` and `127.0.0.1` are different cookie hosts.

The local startup starts loopback API, web, and worker processes in explicit `manual` mode. API health is available at `http://localhost:3000/health`; the web UI is at `http://localhost:3001`.

Live broker/data integrations require separately configured credentials and reviewed permissions. Local startup defaults to explicit **manual** mode; synthetic fixtures remain separate test/development data and never substitute for real holdings.

## Real manual portfolio MVP

After login, open **Portfolio** to add a purchase or sale. Search a reviewed permitted catalogue first; if the instrument is absent, enter its exchange and symbol manually. Such entries remain visibly **unresolved** and are never converted to synthetic or silently broker-mapped. Holdings use FIFO, retain transaction history, and show `Price unavailable` until an owner supplies a labelled manual valuation price.

## Optional Zerodha Kite Personal connection

The live connector is local-server-only. Copy `.env.example` to `.env`, then configure the exact registered callback in `.env`. The backend and worker load `.env`; Vite/browser code does not receive these values.

```dotenv
TRADE_MODE=live
TRADE_MASTER_KEY=a-long-random-local-secret
KITE_API_KEY=your-kite-api-key
KITE_API_SECRET=your-kite-api-secret
KITE_REDIRECT_URL=http://localhost:3000/api/brokers/kite/callback
```

Restart Trade with `npm run stop` then `npm start` after editing `.env`.

Register the same callback URL in the Kite developer console, then use **Connect Zerodha**. Trade redirects to Kite’s hosted login; the callback exchanges the short-lived request token only on the local server, encrypts the resulting access token locally, and redirects back to the web app without the token in the browser URL. Live login/import remains unverified until performed with the owner’s configured Kite app. Snapshot quantities/average prices do not invent purchase dates or trade history, and reconciliation never creates ledger trades.

Kite reference: [official login and token exchange documentation](https://kite.trade/docs/connect/v3/user/) and [official holdings/positions documentation](https://kite.trade/docs/connect/v3/portfolio/).

## Reset a forgotten local owner password

From an interactive terminal on the same Windows machine, run:

```powershell
npm run reset:owner-password
```

The command accepts only a loopback PostgreSQL database, requires a new 12-character-or-longer password twice without echoing it, updates the one local owner record, and revokes existing sessions. It never prints a password hash. This is separate from PostgreSQL and broker credentials.

## Local backup

Create a PostgreSQL custom-format backup and adjacent SHA-256 manifest inside `artifacts/backups`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-local.ps1 -DatabaseUrl $env:DATABASE_URL
```

## Repository boundaries

- `apps/web` — Vue client
- `apps/api` — Node/Fastify API
- `apps/worker` — durable jobs and orchestrator
- `services/analysis` — future Python numerical worker
- `packages/contracts` — shared schemas and types
- `packages/provider-adapters` — broker, data, and synthetic adapters
- `db/migrations` — ordered PostgreSQL migrations
- `tests/fixtures` — synthetic or licensed fixtures
- `docs` — architecture and execution records
