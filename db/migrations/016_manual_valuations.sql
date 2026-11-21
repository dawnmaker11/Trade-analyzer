CREATE TABLE IF NOT EXISTS manual_valuations (
  valuation_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES portfolio_accounts(account_id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  price NUMERIC(20,4) NOT NULL CHECK(price >= 0),
  price_as_of TIMESTAMPTZ NOT NULL,
  source_label TEXT NOT NULL CHECK(source_label IN ('manual')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, account_id, instrument_id, price_as_of, source_label)
);
CREATE INDEX IF NOT EXISTS manual_valuations_latest_idx ON manual_valuations(owner_id, account_id, instrument_id, price_as_of DESC);
INSERT INTO schema_migrations (version) VALUES ('016_manual_valuations') ON CONFLICT (version) DO NOTHING;
