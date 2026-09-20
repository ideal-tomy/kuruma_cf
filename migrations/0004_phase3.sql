-- kuruma_cf Phase 3: LINE 通知・テンプレ・ジョブログ
-- 正本: docs/cf-rebuild/kuruma-実装PLAN.md B6 Phase 3

ALTER TABLE line_unmatched ADD COLUMN last_text TEXT;
ALTER TABLE line_unmatched ADD COLUMN last_message_at TEXT;

CREATE TABLE IF NOT EXISTS template_versions (
  id TEXT PRIMARY KEY,
  template_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('LINE', 'MAIL')),
  subject TEXT,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (template_key, channel, version)
);

CREATE INDEX IF NOT EXISTS template_versions_active_idx
  ON template_versions (template_key, channel, active, version DESC);

CREATE TABLE IF NOT EXISTS notification_rules (
  id TEXT PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  kind TEXT NOT NULL,
  trigger_days_before INTEGER,
  trigger_oil_interval_km INTEGER,
  channels TEXT NOT NULL DEFAULT '["LINE"]',
  template_key TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  rule_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('LINE', 'MAIL')),
  template_key TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL DEFAULT '{}',
  last_error TEXT,
  requested_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_jobs_customer_idx ON notification_jobs (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_jobs_status_idx ON notification_jobs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES notification_jobs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('SUCCESS', 'FAILED', 'BOUNCED', 'COMPLAINED')),
  error_code TEXT,
  error_message TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  sent_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_logs_job_idx ON notification_logs (job_id, sent_at DESC);
