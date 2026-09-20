import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { notFound } from '../lib/errors';
import { filterByRule, isListRule, LIST_RULE_LABELS, loadOverviewFromDb } from '../lib/extraction';

const lists = new Hono<AppEnv>();

lists.get('/:rule', async (c) => {
  const rule = c.req.param('rule');
  if (!isListRule(rule)) return notFound(c, 'Unknown list rule');

  const overview = await loadOverviewFromDb(c.env.DB);
  const targets = filterByRule(overview, rule);

  return c.json({
    rule,
    label: LIST_RULE_LABELS[rule],
    targets,
  });
});

export { lists };
