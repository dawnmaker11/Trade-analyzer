CREATE TABLE IF NOT EXISTS users (
  owner_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  password_salt TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS broker_connections (
  connection_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  broker TEXT NOT NULL,
  secret_reference_id UUID,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, broker)
);

CREATE TABLE IF NOT EXISTS secret_references (
  secret_reference_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  namespace TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(owner_id, namespace)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  owner_id UUID PRIMARY KEY REFERENCES users(owner_id) ON DELETE CASCADE,
  display_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_portfolios (
  portfolio_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_research_runs (
  research_run_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  instrument_id UUID,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_paper_accounts (
  paper_account_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owned_subscriptions (
  subscription_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  audit_event_id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(owner_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  request_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  requested_action TEXT NOT NULL,
  status TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

INSERT INTO schema_migrations (version) VALUES ('002_identity_privacy') ON CONFLICT (version) DO NOTHING;
