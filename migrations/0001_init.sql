-- kuruma_cf Phase 0 placeholder
-- Phase 1: customers, vehicles, consents, extraction views

CREATE TABLE IF NOT EXISTS _schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO _schema_meta (key, value) VALUES ('phase', '0');
