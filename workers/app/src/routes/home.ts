import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { countByRules, LIST_RULES, loadOverviewFromDb } from '../lib/extraction';

const homeRoute = new Hono<AppEnv>();

homeRoute.get('/', async (c) => {
  const overview = await loadOverviewFromDb(c.env.DB);
  const counts = countByRules(overview);

  const lineUnmatched = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM line_unmatched',
  ).first<{ cnt: number }>();

  const sendFailed = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM notification_jobs WHERE status = 'FAILED'",
  ).first<{ cnt: number }>();

  return c.json({
    needsAction: {
      lineUnmatched: lineUnmatched?.cnt ?? 0,
      sendFailed: sendFailed?.cnt ?? 0,
    },
    lists: LIST_RULES.map((rule) => ({ rule, count: counts[rule] })),
    phase: 4,
  });
});

export { homeRoute as home };
