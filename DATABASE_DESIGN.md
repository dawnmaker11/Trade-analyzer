# Database design

Migrations are ordered in `db/migrations` and repeat-safe. PostgreSQL stores identity/session data, instruments and dated mappings, entitlements, portfolios, broker snapshots/reconciliation, market observations, evidence, research workflows/outcomes, risk limits, synthetic paper ledger, and reminders.

Financial/temporal invariants: use PostgreSQL `NUMERIC`; retain UTC timestamps; preserve dated listings, option specs, corporate actions, source versions, and provenance. Corrections void and link prior trades instead of deleting them. Imported research and broker snapshots remain immutable source records. Manual research imports are retained as versioned request payloads and can reference only evidence supplied by that import. Synthetic paper orders reserve account cash under an account-row lock; fills are immutable and performance is deterministically derived from them using FIFO lots.
