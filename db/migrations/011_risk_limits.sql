CREATE TABLE IF NOT EXISTS user_risk_limits (owner_id UUID PRIMARY KEY REFERENCES users(owner_id) ON DELETE CASCADE,
  max_position_value NUMERIC(20,4), max_portfolio_loss NUMERIC(20,4), max_trade_loss NUMERIC(20,4), holding_horizon TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO schema_migrations (version) VALUES ('011_risk_limits') ON CONFLICT (version) DO NOTHING;
