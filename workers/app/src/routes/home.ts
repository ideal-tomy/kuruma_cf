import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { countByRules, loadOverviewFromDb } from '../lib/extraction';
import { parseIssuerFromJson } from '../lib/issuer';

const HOME_LIST_ORDER = [
  'shaken-overdue',
  'shaken-30',
  'shaken-90',
  'shaken-180',
  'oil',
] as const;

const LIST_URGENCY: Record<(typeof HOME_LIST_ORDER)[number], string> = {
  'shaken-overdue': 'critical',
  'shaken-30': 'high',
  'shaken-90': 'medium',
  'shaken-180': 'low',
  oil: 'info',
};

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

  const issuer = parseIssuerFromJson(c.env.ISSUER_JSON);

  return c.json({
    needsAction: {
      lineUnmatched: lineUnmatched?.cnt ?? 0,
      sendFailed: sendFailed?.cnt ?? 0,
    },
    lists: HOME_LIST_ORDER.map((rule) => ({
      rule,
      count: counts[rule],
      urgency: LIST_URGENCY[rule],
    })),
    shopName: issuer?.companyName ?? null,
    phase: 4,
  });
});

export { homeRoute as home };
