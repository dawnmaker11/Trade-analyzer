CREATE TABLE IF NOT EXISTS portfolio_accounts (
  account_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'manual' CHECK (account_type IN ('manual', 'broker')),
  broker_connection_id UUID REFERENCES broker_connections(connection_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, label)
);
CREATE TABLE IF NOT EXISTS portfolio_trades (
  trade_id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES portfolio_accounts(account_id),
  instrument_id UUID NOT NULL REFERENCES instruments(instrument_id),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity NUMERIC(20,4) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20,4) NOT NULL CHECK (price >= 0),
  fees NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  traded_on DATE NOT NULL,
  comment TEXT,
  provenance TEXT NOT NULL CHECK (provenance IN ('manual', 'csv', 'broker')),
  import_key TEXT,
  correction_of UUID REFERENCES portfolio_trades(trade_id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, import_key)
);
CREATE INDEX IF NOT EXISTS portfolio_trades_account_idx ON portfolio_trades(account_id, instrument_id, traded_on, created_at);
CREATE TABLE IF NOT EXISTS cash_entries (
  cash_entry_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(owner_id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES portfolio_accounts(account_id), entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'withdrawal', 'dividend', 'fee_adjustment')),
  amount NUMERIC(20,4) NOT NULL CHECK (amount <> 0), occurred_on DATE NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO schema_migrations (version) VALUES ('005_portfolio_ledger') ON CONFLICT (version) DO NOTHING;
