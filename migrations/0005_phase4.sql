-- kuruma_cf Phase 4: 監査ログ（daily-extract dry-run 記録）
-- 正本: docs/cf-rebuild/kuruma-実装PLAN.md B6 Phase 4

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  resource TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action, created_at DESC);
