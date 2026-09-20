import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './env';
import { requireAuth } from './middleware/requireAuth';
import { auth } from './routes/auth';
import { cron } from './routes/cron';
import { customers } from './routes/customers';
import { home } from './routes/home';
import { lineUnmatched } from './routes/line-unmatched';
import { lists } from './routes/lists';
import { notifications } from './routes/notifications';
import { portal } from './routes/portal';
import { webhookLine } from './routes/webhook-line';
import { quotes } from './routes/quotes';
import { serviceHistories } from './routes/service-histories';
import { vehicles } from './routes/vehicles';

export const app = new Hono<AppEnv>();

app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
  }),
);

app.get('/api/health', async (c) => {
  let dbOk = false;
  try {
    await c.env.DB.prepare('select 1 as ok').first();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  return c.json({
    ok: true,
    service: 'kuruma-cf',
    db: dbOk,
    phase: 4,
    autoSendEnabled: (c.env.AUTO_SEND_ENABLED ?? 'false').toLowerCase() === 'true',
    ts: new Date().toISOString(),
  });
});

app.route('/api/auth', auth);
app.route('/', webhookLine);

app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/api/auth') || path === '/api/health') {
    return next();
  }
  return requireAuth(c, next);
});

app.route('/api/home', home);
app.route('/api/lists', lists);
app.route('/api/customers', customers);
app.route('/api/vehicles', vehicles);
app.route('/api/quotes', quotes);
app.route('/api/notifications', notifications);
app.route('/api/line/unmatched', lineUnmatched);
app.route('/api/cron', cron);
app.route('/api', serviceHistories);

app.route('/', portal);

/** SPA + 静的アセット */
app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});
