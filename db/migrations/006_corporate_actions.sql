CREATE TABLE IF NOT EXISTS corporate_actions (
  corporate_action_id UUID PRIMARY KEY,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  action_type TEXT NOT NULL CHECK (action_type IN ('split', 'bonus', 'dividend')),
  effective_on DATE NOT NULL,
  ratio_numerator NUMERIC(20,6), ratio_denominator NUMERIC(20,6), cash_amount NUMERIC(20,4),
  source_name TEXT NOT NULL, provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_id, action_type, effective_on, source_name)
);
INSERT INTO schema_migrations (version) VALUES ('006_corporate_actions') ON CONFLICT (version) DO NOTHING;
