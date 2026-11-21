# Next Session

## Epic 1 state

Epic 1 is implemented and locally verified. E01.02 has fresh and repeat migration evidence against PostgreSQL 17.

## Verified baseline

- Node.js 20.19.5
- npm 10.8.2
- Git 2.49.0
- PostgreSQL 17.12 on isolated loopback port 5433
- Database: `trade`, cluster at `.local/postgres`
- `npm run check` passes
- `npm test` passes: 6 tests
- `npm run build` passes for API, worker, and web
- Synthetic startup, health, status, and stop flows pass
- Initial migration and repeated migration complete successfully

## Next ready action

Begin Epic 2: implement owner authentication and protected API sessions. Reuse the isolated PostgreSQL cluster and shared configuration foundation.

## External prerequisites

- Zerodha developer app and callback registration for E04.02 live acceptance
- Licensed market and options data for historical and live stories
- LLM and news subscriptions for future activation

# Next Session

## Epic 2 state

Epic 2 is implemented and locally verified. The server provides setup/login/logout, HTTP-only sessions, owner-scoped records, preferences, secret references, audit history, and privacy export/request endpoints.

## Verified behavior

- Unauthenticated `/api/auth/me` and `/api/settings` return `AUTH_REQUIRED`
- Owner setup creates a session and audit event
- Authenticated `/api/auth/me` resolves the session owner
- Preferences update successfully and append an audit event
- Privacy export contains owner/preferences/audit data and no access tokens
- Cross-owner or missing portfolio IDs return `NOT_FOUND`
- Logout revokes the session and subsequent protected access returns `AUTH_REQUIRED`
- `npm test`: 10 tests passed
- `npm run check` passed
- `npm run build` passed

## Next ready action

Begin Epic 3: instrument security master, effective-dated contracts, source-use policies, dataset reports, and permitted catalogue import.

## Start commands

```powershell
Set-Location "D:\Tech\TradeAnalyzerApp"
$env:DATABASE_URL="postgresql://postgres@127.0.0.1:5433/trade"
npm start
```

# Next Session

## UI foundation state

E01.05, E02.05 and E02.06 are implemented and visually inspected. Setup now uses the backend setup status, login and logout are connected to real sessions, and the authenticated shell is responsive with honest unavailable-feature states.

## Verified behavior

- Backend reports setup-needed correctly
- Setup and login use real session cookies
- Invalid password displays an inline error
- Duplicate submissions are blocked while loading
- Authenticated shell shows Portfolio, Explore, Paper Trading, Research/Chat, Alerts and Settings
- Synthetic mode is visible at all entry points
- Mobile navigation exposes the shell through a menu
- Logout is available from the sidebar

## Verification commands

```powershell
npm test
npm run check
npm run build
```

## Next ready action

Begin Epic 4 with the shared connector contract and fixture adapter. Live Zerodha acceptance remains blocked until a developer application and registered loopback callback are supplied.

## Epic 4 progress

E04.01 is verified with the deterministic fixture connector in `apps/api/src/brokers.ts`. Next: persist connection/snapshot state and wire protected callback/sync routes; live Kite acceptance remains blocked on the owner’s developer credentials.

Fixture callback/snapshot persistence is now implemented by migration `004_broker_snapshots`; isolated API smoke tests cover authenticated connect, callback, sync and duplicate snapshot retry. E04.03 continues after the E05 transaction ledger is implemented.

# Epic 3 completion record

Epic 3 is implemented and verified. Migration `003_instruments_entitlements` adds the catalogue, source-policy, report, calendar, and dated-option tables. The Explore page searches/imports a reviewed local CSV catalogue without any paid feed.

Verification: type-check and production build passed; isolated PostgreSQL migration/API smoke suite passed with 16 tests.
