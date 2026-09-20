-- kuruma_cf Phase 2: 見積・整備履歴・法定費用マスタ
-- 正本: docs/cf-rebuild/kuruma-実装PLAN.md B6 Phase 2

ALTER TABLE vehicles ADD COLUMN vehicle_specs TEXT DEFAULT '{}';

CREATE TABLE IF NOT EXISTS statutory_fee_rates (
  id TEXT PRIMARY KEY,
  effective_from TEXT NOT NULL,
  vehicle_class TEXT NOT NULL CHECK (vehicle_class IN ('LIGHT', 'STANDARD')),
  jibaiseki_24mo_yen INTEGER NOT NULL,
  weight_tax_yen_standard INTEGER NOT NULL,
  weight_tax_yen_eco INTEGER NOT NULL,
  prepaid_inspection_yen INTEGER NOT NULL DEFAULT 2200,
  lane_stamp_yen INTEGER NOT NULL DEFAULT 2300,
  document_fee_yen INTEGER NOT NULL DEFAULT 770,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (effective_from, vehicle_class)
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  quote_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  total_amount INTEGER NOT NULL DEFAULT 0,
  legal_items TEXT NOT NULL DEFAULT '[]',
  service_items TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  valid_until TEXT,
  issued_at TEXT,
  taxable_subtotal_ex_tax INTEGER NOT NULL DEFAULT 0,
  tax_amount_10 INTEGER NOT NULL DEFAULT 0,
  non_taxable_subtotal INTEGER NOT NULL DEFAULT 0,
  grand_total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS quotes_vehicle_idx ON quotes (vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes (status);

CREATE TABLE IF NOT EXISTS service_histories (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  mileage INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS service_histories_vehicle_idx ON service_histories (vehicle_id, performed_at DESC);
