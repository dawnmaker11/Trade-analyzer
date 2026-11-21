CREATE TABLE IF NOT EXISTS research_requests (
  request_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id), request_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL, question TEXT NOT NULL, horizon TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  supersedes_request_id UUID REFERENCES research_requests(request_id), created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS research_transitions (transition_id UUID PRIMARY KEY, request_id UUID NOT NULL REFERENCES research_requests(request_id) ON DELETE CASCADE, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE, from_status TEXT, to_status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO schema_migrations (version) VALUES ('010_research_runs') ON CONFLICT (version) DO NOTHING;
