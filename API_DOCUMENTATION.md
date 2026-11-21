# API documentation

The API binds to loopback and requires an owner session for business routes. Major route groups:

- `/api/instruments`, `/api/options`, `/api/data-sources`: catalogue, dated contracts, and use policy.
- `/api/portfolios`: accounts, trades, CSV preview/commit, valuation, cash entries, reconciliation.
- `/api/market/observations`: permission-gated manual observation import and bounded reads.
- `/api/research-requests`, `/api/evidence`, `/api/review-reminders`: manual evidence/research/review workflow.
- `/api/risk-limits`, `/api/paper`: fail-closed limits and synthetic-only paper accounts/orders/fills.

`GET /api/paper/accounts/:accountId/performance` provides FIFO realised P&L and open positions at cost from filled synthetic orders. It intentionally returns `null` for equity, returns, drawdown and unrealised P&L when no explicitly permitted market mark exists; synthetic results are never reported as live performance.

`GET /api/research-requests/:requestId/export` emits an owner-scoped, ready-to-paste Phase A research template. `POST /api/research-requests/:requestId/import` accepts only schema version `1.0`, a matching request/instrument/version, time-ordered horizons, and evidence IDs that resolve inside the submitted import. Stored imports are explicitly external, manual, and unverified.

`GET /api/research-requests/:requestId/cards` provides deterministic research cards from the saved import and the selected 21-day window of stored observations. It returns an explicit unavailable state instead of fabricating a return when fewer than two observations exist.

`GET /api/evidence?instrumentId=…` lists the signed-in owner’s evidence linked to an instrument. URLs are returned for user-directed opening only and retain their unverified status.

Portfolio MVP endpoints include `POST /api/instruments/manual` for explicit unresolved owner symbols, transaction history and holdings reads under `/api/portfolios/accounts/:accountId`, and owner-labelled manual valuation marks at `PUT /api/portfolios/accounts/:accountId/manual-valuations/:instrumentId`. Holdings use FIFO and do not return a current value unless a manual mark exists.

Live Kite routes are `POST /api/broker-connections/kite/connect`, callback `GET /api/brokers/kite/callback`, and `POST /api/broker-connections/kite/live-sync`. They require server-only Kite configuration; no secret or access token is returned to the browser.

Route-specific request/response behavior is covered by code and focused tests; errors use structured codes such as `AUTH_REQUIRED`, `VALIDATION_ERROR`, `CONFLICT`, and `USAGE_NOT_PERMITTED`.

The local owner-password recovery command is deliberately not an unauthenticated HTTP endpoint. `npm run reset:owner-password` runs only in an interactive terminal and only against a loopback PostgreSQL database.
