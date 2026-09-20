import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';

const lineUnmatched = new Hono<AppEnv>();

lineUnmatched.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM line_unmatched ORDER BY created_at DESC',
  ).all<{
    id: string;
    line_user_id: string;
    display_name: string | null;
    last_text: string | null;
    last_message_at: string | null;
    created_at: string;
  }>();

  return c.json({
    items: (results ?? []).map((row) => ({
      id: row.id,
      lineUserId: row.line_user_id,
      displayName: row.display_name,
      lastText: row.last_text,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
    })),
  });
});

lineUnmatched.post('/:lineUserId/link', async (c) => {
  const lineUserId = c.req.param('lineUserId');
  const body = await c.req.json<{ customerId?: string }>();
  if (!body.customerId) return badRequest(c, 'customerId is required');

  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(body.customerId)
    .first();
  if (!customer) return notFound(c, 'Customer not found');

  const duplicate = await c.env.DB.prepare(
    'SELECT id FROM customers WHERE line_user_id = ? AND id != ?',
  )
    .bind(lineUserId, body.customerId)
    .first();
  if (duplicate) {
    return c.json({ error: 'この LINE userId は別の顧客に紐付いています' }, 409);
  }

  const ts = nowIso();
  await c.env.DB.prepare(
    'UPDATE customers SET line_user_id = ?, updated_at = ? WHERE id = ?',
  )
    .bind(lineUserId, ts, body.customerId)
    .run();

  await c.env.DB.prepare(
    `INSERT INTO consents (id, customer_id, channel, opt_in, source, updated_at)
     VALUES (?, ?, 'LINE', 1, 'line_match_manual', ?)
     ON CONFLICT(customer_id, channel) DO UPDATE SET
       opt_in = 1, source = 'line_match_manual', updated_at = excluded.updated_at`,
  )
    .bind(newId(), body.customerId, ts)
    .run();

  await c.env.DB.prepare('DELETE FROM line_unmatched WHERE line_user_id = ?')
    .bind(lineUserId)
    .run();

  return c.json({ ok: true, customerId: body.customerId, lineUserId });
});

export { lineUnmatched };
