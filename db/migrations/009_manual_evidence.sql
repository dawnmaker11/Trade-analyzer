CREATE TABLE IF NOT EXISTS evidence_records (
  evidence_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  title TEXT NOT NULL, source_url TEXT NOT NULL, published_at TIMESTAMPTZ, retrieved_at TIMESTAMPTZ NOT NULL,
  excerpt TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('allegation','confirmed_event','unverified')),
  canonical_url TEXT NOT NULL, revision_of UUID REFERENCES evidence_records(evidence_id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, canonical_url, retrieved_at)
);
CREATE TABLE IF NOT EXISTS evidence_instruments (evidence_id UUID NOT NULL REFERENCES evidence_records(evidence_id) ON DELETE CASCADE, instrument_id UUID NOT NULL REFERENCES instruments(instrument_id), PRIMARY KEY(evidence_id,instrument_id));
INSERT INTO schema_migrations (version) VALUES ('009_manual_evidence') ON CONFLICT (version) DO NOTHING;
