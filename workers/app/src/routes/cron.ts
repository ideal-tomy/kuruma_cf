import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { runDailyExtract } from '../lib/daily-extract';
import type { AuditLogRow } from '../types';

const cron = new Hono<AppEnv>();

cron.post('/daily-extract', async (c) => {
  const result = await runDailyExtract(c.env, { trigger: 'manual' });
  return c.json(result);
});

cron.get('/daily-extract/last', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT * FROM audit_logs WHERE action = 'cron.daily_extract'
     ORDER BY created_at DESC LIMIT 1`,
  ).first<AuditLogRow>();

  if (!row) {
    return c.json({ last: null });
  }

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.payload);
  } catch {
    parsed = row.payload;
  }

  return c.json({
    last: {
      id: row.id,
      action: row.action,
      resource: row.resource,
      payload: parsed,
      createdAt: row.created_at,
    },
  });
});

export { cron };
