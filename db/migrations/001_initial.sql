CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instruments (
  instrument_id UUID PRIMARY KEY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  isin TEXT,
  data_mode TEXT NOT NULL DEFAULT 'synthetic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exchange, symbol)
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id UUID PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lease_token UUID,
  lease_expires_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT jobs_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS jobs_claim_idx
  ON jobs (status, available_at, lease_expires_at);

INSERT INTO instruments (instrument_id, exchange, symbol, name, data_mode)
VALUES ('00000000-0000-4000-8000-000000000001', 'NSE', 'TATASTEEL', 'Tata Steel', 'synthetic')
ON CONFLICT (exchange, symbol) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT (version) DO NOTHING;
