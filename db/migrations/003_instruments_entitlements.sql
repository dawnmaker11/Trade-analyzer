-- Epic 3: catalogued identities, dated contract specifications, and data-use provenance.
ALTER TABLE instruments
  ADD COLUMN IF NOT EXISTS asset_class TEXT NOT NULL DEFAULT 'equity',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS instrument_listings (
  listing_id UUID PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  display_name TEXT,
  isin TEXT,
  valid_from DATE NOT NULL,
  valid_to DATE,
  source_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT listing_dates_valid CHECK (valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE (exchange, symbol, valid_from)
);

CREATE INDEX IF NOT EXISTS instrument_listings_search_idx
  ON instrument_listings (exchange, symbol, valid_from DESC);
CREATE INDEX IF NOT EXISTS instrument_listings_instrument_idx ON instrument_listings(instrument_id);

CREATE TABLE IF NOT EXISTS provider_mappings (
  provider_mapping_id UUID PRIMARY KEY,
  provider_name TEXT NOT NULL,
  provider_instrument_key TEXT NOT NULL,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  valid_from DATE NOT NULL,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT provider_mapping_dates_valid CHECK (valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE (provider_name, provider_instrument_key, valid_from)
);

CREATE INDEX IF NOT EXISTS provider_mappings_lookup_idx
  ON provider_mappings(provider_name, provider_instrument_key, valid_from DESC);

CREATE TABLE IF NOT EXISTS option_contracts (
  contract_id UUID PRIMARY KEY,
  instrument_id UUID NOT NULL UNIQUE REFERENCES instruments(instrument_id),
  underlying_instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  exchange TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('CE', 'PE')),
  strike NUMERIC(20, 4) NOT NULL CHECK (strike > 0),
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS option_contracts_resolution_idx
  ON option_contracts(underlying_instrument_id, exchange, expiry_date, strike, option_type);

CREATE TABLE IF NOT EXISTS option_contract_specifications (
  specification_id UUID PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES option_contracts(contract_id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  lot_size NUMERIC(20, 4) NOT NULL CHECK (lot_size > 0),
  tick_size NUMERIC(20, 4) NOT NULL CHECK (tick_size > 0),
  source_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT option_specification_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE(contract_id, effective_from)
);

CREATE TABLE IF NOT EXISTS exchange_calendar_days (
  calendar_day_id UUID PRIMARY KEY,
  exchange TEXT NOT NULL,
  calendar_date DATE NOT NULL,
  is_trading_day BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  source_name TEXT NOT NULL,
  UNIQUE(exchange, calendar_date)
);

CREATE TABLE IF NOT EXISTS data_sources (
  source_id UUID PRIMARY KEY,
  source_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_source_policies (
  policy_id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES data_sources(source_id) ON DELETE CASCADE,
  use_case TEXT NOT NULL CHECK (use_case IN ('personal_analytics', 'simulation', 'storage', 'ai_processing', 'redistribution')),
  decision TEXT NOT NULL CHECK (decision IN ('permitted', 'prohibited', 'unresolved')),
  rationale TEXT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT source_policy_dates_valid CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE(source_id, use_case, effective_from)
);

CREATE INDEX IF NOT EXISTS source_policies_active_idx ON data_source_policies(source_id, use_case, effective_from DESC);

CREATE TABLE IF NOT EXISTS catalogue_imports (
  catalogue_import_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES data_sources(source_id),
  source_as_of TIMESTAMPTZ NOT NULL,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('manual', 'synthetic', 'licensed')),
  checksum TEXT NOT NULL,
  imported_count INTEGER NOT NULL DEFAULT 0,
  unresolved_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, source_as_of, checksum)
);

CREATE TABLE IF NOT EXISTS dataset_acceptance_reports (
  report_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  source_id UUID REFERENCES data_sources(source_id),
  dataset_name TEXT NOT NULL,
  assessed_at TIMESTAMPTZ NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('accepted', 'accepted_with_limits', 'rejected', 'dependency')),
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unresolved_instruments (
  unresolved_instrument_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  exchange TEXT,
  symbol TEXT NOT NULL,
  name TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'rejected')),
  resolved_instrument_id UUID REFERENCES instruments(instrument_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

-- Preserve the Epic 1 synthetic fixture as a clearly labelled catalogue listing.
INSERT INTO instrument_listings (listing_id, instrument_id, exchange, symbol, display_name, isin, valid_from, source_name)
SELECT gen_random_uuid(), instrument_id, exchange, symbol, name, isin, DATE '2026-01-01', 'Epic 1 synthetic fixture'
FROM instruments
WHERE instrument_id = '00000000-0000-4000-8000-000000000001'
ON CONFLICT (exchange, symbol, valid_from) DO NOTHING;

INSERT INTO data_sources (source_id, source_key, display_name, source_kind, source_url, reviewed_at)
VALUES
  (gen_random_uuid(), 'synthetic-catalogue', 'Synthetic development catalogue', 'catalogue', NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'kite-personal', 'Kite Personal', 'broker', 'https://kite.trade/', CURRENT_TIMESTAMP)
ON CONFLICT (source_key) DO NOTHING;

INSERT INTO data_source_policies (policy_id, source_id, use_case, decision, rationale, effective_from)
SELECT gen_random_uuid(), source_id, use_case, decision, rationale, CURRENT_DATE
FROM data_sources
CROSS JOIN LATERAL (VALUES
  ('personal_analytics', CASE WHEN source_key = 'synthetic-catalogue' THEN 'permitted' ELSE 'unresolved' END, 'Review provider terms before activation.'),
  ('simulation', CASE WHEN source_key = 'synthetic-catalogue' THEN 'permitted' ELSE 'prohibited' END, CASE WHEN source_key = 'kite-personal' THEN 'Kite-sourced inputs must not be used for virtual trading under the recorded Phase A policy.' ELSE 'Synthetic data is isolated for development.' END),
  ('storage', CASE WHEN source_key = 'synthetic-catalogue' THEN 'permitted' ELSE 'unresolved' END, 'Review provider terms before activation.'),
  ('ai_processing', 'unresolved', 'No source is sent to an AI service unless this is explicitly permitted.'),
  ('redistribution', CASE WHEN source_key = 'synthetic-catalogue' THEN 'permitted' ELSE 'prohibited' END, 'Private local catalogue only; do not redistribute provider data.')
) AS policies(use_case, decision, rationale)
ON CONFLICT (source_id, use_case, effective_from) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('003_instruments_entitlements') ON CONFLICT (version) DO NOTHING;
