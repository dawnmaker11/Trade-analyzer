CREATE TABLE IF NOT EXISTS market_observations (
  observation_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id), source_id UUID REFERENCES data_sources(source_id),
  source_timestamp TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('quote','candle','option_snapshot')),
  open NUMERIC(20,4), high NUMERIC(20,4), low NUMERIC(20,4), close NUMERIC(20,4), volume NUMERIC(24,4),
  source_version TEXT NOT NULL DEFAULT '1', provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_id, instrument_id, source_timestamp, source_version, observation_type)
);
CREATE INDEX IF NOT EXISTS market_observations_chart_idx ON market_observations(instrument_id, source_timestamp);
INSERT INTO schema_migrations (version) VALUES ('008_market_observations') ON CONFLICT (version) DO NOTHING;
