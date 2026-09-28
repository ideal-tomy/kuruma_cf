import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { fetchLineDisplayName, verifyLineSignature } from '../lib/line';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';

type LineEvent = {
  type: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

const webhookLine = new Hono<AppEnv>();

webhookLine.post('/webhook/line', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-line-signature') ?? null;
  const ok = await verifyLineSignature(
    c.env.LINE_CHANNEL_SECRET,
    rawBody,
    signature,
    true,
  );
  if (!ok) return c.json({ error: 'invalid signature' }, 401);

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = body.events ?? [];

  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (event.type === 'follow') {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM customers WHERE line_user_id = ?',
      )
        .bind(userId)
        .first();
      if (!existing) {
        const ts = nowIso();
        const displayName = await fetchLineDisplayName(c.env.LINE_CHANNEL_ACCESS_TOKEN, userId);
        await c.env.DB.prepare(
          `INSERT INTO line_unmatched (id, line_user_id, display_name, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(line_user_id) DO UPDATE SET
             display_name = COALESCE(excluded.display_name, line_unmatched.display_name)`,
        )
          .bind(newId(), userId, displayName, ts)
          .run();
      }
    } else if (event.type === 'unfollow') {
      const customer = await c.env.DB.prepare('SELECT id FROM customers WHERE line_user_id = ?')
        .bind(userId)
        .first<{ id: string }>();
      if (customer) {
        const ts = nowIso();
        await c.env.DB.prepare(
          `INSERT INTO consents (id, customer_id, channel, opt_in, opt_out_at, source, updated_at)
           VALUES (?, ?, 'LINE', 0, ?, 'line_unfollow', ?)
           ON CONFLICT(customer_id, channel) DO UPDATE SET
             opt_in = 0, opt_out_at = excluded.opt_out_at, source = excluded.source, updated_at = excluded.updated_at`,
        )
          .bind(newId(), customer.id, ts, ts)
          .run();
      }
      await c.env.DB.prepare('DELETE FROM line_unmatched WHERE line_user_id = ?')
        .bind(userId)
        .run();
    } else if (event.type === 'message') {
      const text = event.message?.text ?? '';
      const matched = await c.env.DB.prepare('SELECT id FROM customers WHERE line_user_id = ?')
        .bind(userId)
        .first();
      if (!matched && text) {
        const ts = nowIso();
        const displayName = await fetchLineDisplayName(c.env.LINE_CHANNEL_ACCESS_TOKEN, userId);
        await c.env.DB.prepare(
          `INSERT INTO line_unmatched (id, line_user_id, display_name, last_text, last_message_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(line_user_id) DO UPDATE SET
             display_name = COALESCE(excluded.display_name, line_unmatched.display_name),
             last_text = excluded.last_text,
             last_message_at = excluded.last_message_at`,
        )
          .bind(newId(), userId, displayName, text, ts, ts)
          .run();
      }
    }
  }

  return c.json({ ok: true });
});

export { webhookLine };
