CREATE TABLE IF NOT EXISTS reconciliation_runs (
  reconciliation_run_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES portfolio_accounts(account_id), snapshot_id UUID NOT NULL REFERENCES broker_snapshots(snapshot_id),
  status TEXT NOT NULL CHECK (status IN ('matched','mismatch','unresolved')), results JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, snapshot_id)
);
INSERT INTO schema_migrations (version) VALUES ('007_reconciliation') ON CONFLICT (version) DO NOTHING;
