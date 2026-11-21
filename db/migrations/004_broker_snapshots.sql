ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS auth_state JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
ALTER TABLE broker_connections ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS broker_snapshots (
  snapshot_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES broker_connections(connection_id) ON DELETE CASCADE,
  snapshot_key TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'partial', 'failed')),
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(connection_id, snapshot_key)
);
CREATE TABLE IF NOT EXISTS broker_snapshot_items (
  snapshot_item_id UUID PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES broker_snapshots(snapshot_id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL CHECK (item_kind IN ('holding', 'position')),
  provider_instrument_key TEXT NOT NULL,
  instrument_id UUID REFERENCES instruments(instrument_id),
  quantity NUMERIC(20,4) NOT NULL,
  average_price NUMERIC(20,4),
  purchase_date DATE,
  resolution_status TEXT NOT NULL CHECK (resolution_status IN ('resolved', 'unresolved')),
  payload JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS broker_snapshots_owner_idx ON broker_snapshots(owner_id, observed_at DESC);
INSERT INTO schema_migrations (version) VALUES ('004_broker_snapshots') ON CONFLICT (version) DO NOTHING;
