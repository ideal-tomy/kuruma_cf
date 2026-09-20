-- kuruma_cf Phase 1: マスタ + 抽出の土台
-- 正本: docs/cf-rebuild/kuruma-実装PLAN.md B2

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  furigana TEXT,
  phone TEXT,
  email TEXT,
  line_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OPTED_OUT')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_line_user_id_idx ON customers (line_user_id)
  WHERE line_user_id IS NOT NULL AND line_user_id != '';
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);
CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (name);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  maker TEXT NOT NULL,
  model TEXT NOT NULL,
  plate TEXT NOT NULL,
  vin TEXT,
  inspection_expire_date TEXT NOT NULL,
  initial_mileage INTEGER NOT NULL DEFAULT 0,
  initial_mileage_recorded_at TEXT NOT NULL,
  monthly_avg_km INTEGER,
  last_oil_change_mileage INTEGER,
  last_oil_change_at TEXT,
  oil_interval_km INTEGER NOT NULL DEFAULT 4000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vehicles_customer_idx ON vehicles (customer_id);
CREATE INDEX IF NOT EXISTS vehicles_inspection_expire_idx ON vehicles (inspection_expire_date);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('LINE', 'MAIL')),
  opt_in INTEGER NOT NULL DEFAULT 1,
  opt_out_at TEXT,
  source TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (customer_id, channel)
);

CREATE INDEX IF NOT EXISTS consents_customer_idx ON consents (customer_id, channel);

-- Phase 3 で Webhook 連携。Phase 1 は件数表示用
CREATE TABLE IF NOT EXISTS line_unmatched (
  id TEXT PRIMARY KEY,
  line_user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TEXT NOT NULL
);
