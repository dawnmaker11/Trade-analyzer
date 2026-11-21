# Trade Story Status

Source: `Trade-Architecture-and-Execution-Backlog-local.md`, Version 2.0.  
Release target: Phase A. Status values are Planned, In Progress, Implemented, Verified, Blocked External, or Deferred by Scope.

| Story | Status | Evidence / next prerequisite |
|---|---|---|
| E01.01 | Verified | Clean TypeScript/Vue build, tests, synthetic startup, loopback health smoke test, and start/status/stop scripts pass. |
| E01.02 | Verified | PostgreSQL 17.12 migration and repeat migration passed; schema provenance and job table verified. Atomic claim, lease, completion, and retry code is implemented. |
| E01.03 | Verified | Zod API envelope validation, Vitest suite, TypeScript/Vue checks, production build, and Windows CI workflow pass. |
| E01.04 | Verified | Synthetic default, capability flags, UTC clock abstraction, Asia/Kolkata timezone, loopback defaults, and invalid-port tests pass. |
| E01.05 | Verified | Shared CSS visual system, reusable cards/buttons/inputs/badges/feedback states, responsive layouts, keyboard focus and accessible labels implemented; desktop/mobile screenshots inspected. |
| E02.01 | Verified | HTTP-only 480-minute sessions, password PBKDF2 verification, setup/login/logout, expiry/revocation, and unauthenticated-route checks pass. |
| E02.02 | Verified | Every owner-scoped route requires a valid session and database queries include owner_id. Missing/cross-owner records return NOT_FOUND or AUTH_REQUIRED. |
| E02.03 | Verified | AES-256-GCM secret storage, broker secret rotation/disconnect, redaction primitives, and token-free privacy export are implemented; live providers remain external. |
| E02.04 | Verified | Preferences, notification settings, audit history, privacy export, and privacy deletion/export requests are implemented and smoke-tested. |
| E02.05 | Verified | Setup state detection, setup/login UI, password visibility, validation, loading, duplicate-submit protection and server setup restriction implemented; invalid password returns a visible error. |
| E02.06 | Verified | Responsive sidebar/mobile navigation, top bar, synthetic-mode badge, protected authenticated shell, unavailable-feature states and working logout flow implemented. |
| E03.01 | Verified | Searchable dated listings, ISIN-aware identity updates, and provider mappings are implemented; isolated PostgreSQL API smoke tests cover import, idempotency, search, and expired mapping rejection. |
| E03.02 | Verified | Exact option contracts, effective-dated lot/tick specifications, and explicit exchange-calendar days are implemented; smoke tests verify historical lot-size replay and a recorded holiday. |
| E03.03 | Verified | Source-use policy records expose permitted/prohibited/unresolved decisions. The recorded Kite Personal simulation policy rejects use for virtual trading; synthetic remains permitted. |
| E03.04 | Verified | Authenticated dataset acceptance reports persist schema, coverage, missing intervals/fields, usable horizons, rights notes, and an explicit dependency verdict. |
| E03.05 | Verified | Reviewed local CSV catalogue import requires source/as-of/mode, is checksum-idempotent, supports unresolved manual entries, and is available from Explore without a paid endpoint. |
| E04.01 | Verified | Shared connector lifecycle and Kite fixture adapter are implemented. Contract tests cover successful connect/callback/holdings/positions/sync plus rate-limited, expired, unavailable, and unsupported-history paths. |
| E04.02 | In Progress | The local live Kite path uses the official v3 hosted-login URL, exact registered loopback callback, server-side request-token checksum exchange, encrypted local access-token storage, snapshot sync, reconnect and disconnect handling. Actual Zerodha login/import acceptance remains pending the owner’s Kite API key, secret, registered callback and local credentials. |
| E04.03 | Verified | Idempotent immutable fixture snapshots reconcile against owner-scoped manual ledger quantities; matched/mismatch/unresolved runs and unknown purchase dates are persisted and audited. Live broker acceptance remains separate. |
| E04.04 | Blocked External | Angel One and Upstox credentials and live authorization are required. |
| E05.01 | Verified | Portfolio now exposes Add holding after login, catalogue selection or explicit unresolved manual symbol entry, purchase/sale entry, comments, transaction history API, FIFO sale validation, and append-only corrections. Fresh-PostgreSQL integration coverage exercises purchases and partial sale. |
| E05.02 | Verified | CSV preview validates rows and exact dated catalogue resolution; batch commits are transactional and retry-safe. Isolated database smoke coverage passed. |
| E05.03 | Verified | FIFO holdings read model displays quantity, invested amount and average cost. Only explicitly entered manual valuation marks are used; absent marks say Price unavailable. Fresh-PostgreSQL coverage verifies 10@₹100 + 5@₹120 − 4@₹130 yields 11 units, ₹1,200 cost and ₹120 realised P&L. |
| E05.04 | Implemented | Effective-dated split/bonus/dividend records and derived split/bonus lot adjustment are implemented without rewriting raw trades. |
| E06.01 | Implemented | Explicit manual/synthetic market-observation import is available; live provider activation remains external and rights-gated. |
| E06.02 | Implemented | Candle validation rejects negative/impossible OHLC values; stored observations retain source timestamps and are read with explicit sparse/candle labeling. |
| E06.03 | Planned | Historical ingestion implementation pending. |
| E06.04 | Planned | Source health and fallback implementation pending. |
| E06.05 | Implemented | Permission-gated, atomic manual quote/candle/option-snapshot import and bounded provenance-labelled series retrieval are implemented. |
| E07.01 | Planned | Filing/profile ingestion pending. |
| E07.02 | Planned | News ingestion pending. |
| E07.03 | Planned | Exposure mapping pending. |
| E07.04 | Planned | Event calendar pending. |
| E07.05 | Implemented | Manual evidence records store timestamps, excerpts, instruments, status and revisions; links alone remain explicitly unverified. |
| E08.01 | Implemented | Responsive keyboard-accessible navigation for Portfolio, Explore, Paper Trading, Research/Chat, Alerts and Settings is implemented; Explore search and selectable local results work in the authenticated shell. |
| E08.02 | In Progress | Explore renders an accessible, responsive close-price line chart and optional supplied-volume bars from selected observations, with explicit date range/provenance and no live-data claim. Candles, trade markers, comparisons, and downsampling remain pending. |
| E08.03 | In Progress | Explore shows an owner-scoped, instrument-linked manual evidence panel with status, published/retrieved dates, excerpt, and user-directed source link. It explicitly disclaims causal attribution and ownership data; factor hypotheses, confidence limitations, and dated ownership graphs remain pending. |
| E08.04 | Planned | Loading and accessibility states pending. |
| E09.01 | Implemented | Persistent owner-scoped state machine and audited deterministic transitions are implemented; timeout/retry scheduling remains pending. |
| E09.02 | Planned | Typed role contracts pending. |
| E09.03 | Planned | Untrusted-content defenses pending. |
| E09.04 | Planned | Evidence review and audit pending. |
| E09.05 | Implemented | Copyable guarded export, structured import, version/instrument matching, and review routing are implemented without model credentials. |
| E09.06 | Planned | Agent instruction registry pending. |
| E10.01 | Deferred by Scope | Phase B trained forecasting work. |
| E10.02 | Deferred by Scope | Phase B baselines and model candidates. |
| E10.03 | Deferred by Scope | Phase B walk-forward evaluation. |
| E10.04 | Deferred by Scope | Phase B calibration and lifecycle. |
| E11.01 | Deferred by Scope | Phase B live/approved option analytics. |
| E11.02 | Deferred by Scope | Phase B contract scenarios. |
| E11.03 | Deferred by Scope | Phase B options sizing integration. |
| E11.04 | Blocked External | Licensed historical expired-options dataset required. |
| E12.01 | Implemented | Owner risk limits persist through protected APIs and fail closed when required values are missing. |
| E12.02 | Implemented | Deterministic entry/stop size preview caps quantity by value and stop-loss limits and never presents investment advice. |
| E12.03 | Planned | Portfolio review implementation pending. |
| E12.04 | Planned | Recommendation validation implementation pending. |
| E13.01 | Verified | Isolated synthetic virtual accounts, cash reservations, atomic account locks, and filled-long sell checks are implemented; database-enabled lifecycle test passed. |
| E13.02 | Verified | Risk-gated synthetic orders, cancellation, fills, and cash release/credit are implemented and exercised through authenticated HTTP smoke tests. |
| E13.03 | Implemented | Synthetic-only compliant limit fills are atomic; quote-aware, partial-fill, stop, gap, and candle-ambiguity policies remain pending. |
| E13.04 | Planned | Synthetic exits, expiry and fees pending. |
| E13.05 | In Progress | Owner-scoped FIFO closed P&L and cost-basis open positions are available from filled synthetic orders; market-mark-dependent equity, return, drawdown and unrealised P&L are explicitly unavailable pending permitted marks. |
| E14.01 | Planned | Alert rule implementation pending. |
| E14.02 | Planned | Trigger evaluation pending. |
| E14.03 | Planned | Persistent inbox and push implementation pending. |
| E14.04 | Planned | Device and recovery acceptance pending. |
| E14.05 | Implemented | Owner-scoped review reminders support create/list/acknowledge/dismiss/snooze and state snapshot-only monitoring explicitly. |
| E15.01 | Planned | Research intent and context implementation pending. |
| E15.02 | Planned | Grounded response cards pending. |
| E15.03 | Planned | Save monitoring and virtual-trade conversion pending. |
| E15.04 | Planned | Conversation provenance pending. |
| E15.05 | Implemented | The owner-scoped export endpoint produces a ready-to-paste, versioned Phase A JSON template with request/instrument identity, horizon, observation freshness or an explicit gap, evidence instructions, and no account credentials. Browser copy UI remains pending. |
| E15.06 | Implemented | The manual import endpoint requires the versioned envelope, exact request/instrument/version match, time-ordered horizon, unique and resolvable evidence references, safe text, and external-origin/unverified labels. Preview/confirm browser UI and file upload remain pending. |
| E15.07 | In Progress | Owner-scoped deterministic cards expose imported summary, evidence-linked factor groups, scenarios, and a bounded 21-day stored-observation return. Every result carries manual/unverified and non-live labels; browser cards and predefined-question controls remain pending. |
| E16.01 | Planned | Signal registry pending. |
| E16.02 | Planned | Imported and model outcome evaluation pending. |
| E16.03 | Planned | Performance dashboard pending. |
| E16.04 | Planned | Drift and review implementation pending. |
| E16.05 | Implemented | Separate owner-scoped outcomes preserve imported analysis and track pending/evaluated/ambiguous/insufficient-data states. |
| E17.01 | Planned | Windows launch and backup implementation pending. |
| E17.02 | Implemented | Local data-health endpoint exposes mode, job counts, observation freshness and capability labels; live-provider monitoring remains not configured. |
| E17.03 | Planned | Integrated acceptance pending. |
| E17.04 | Planned | Local release report pending. |
