import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppEnv } from '../env';
import { badRequest } from '../lib/errors';
import { createSessionToken, SESSION_COOKIE, verifySessionToken } from '../lib/session';

const auth = new Hono<AppEnv>();

type LoginBody = {
  email?: string;
  password?: string;
};

auth.post('/login', async (c) => {
  const body = await c.req.json<LoginBody>();
  const email = body.email?.trim();
  const password = body.password ?? '';

  const demoEmail = c.env.DEMO_EMAIL ?? 'demo@example.com';
  const demoPassword = c.env.DEMO_PASSWORD ?? 'changeme';

  if (!email || !password) return badRequest(c, 'email and password are required');
  if (email !== demoEmail || password !== demoPassword) {
    return c.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, 401);
  }

  const token = await createSessionToken(email, c.env.SESSION_SECRET);
  const secure = new URL(c.req.url).protocol === 'https:';
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.json({ ok: true, email });
});

auth.post('/logout', async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  const session = await verifySessionToken(token, c.env.SESSION_SECRET);
  if (!session) return c.json({ authenticated: false }, 401);
  return c.json({ authenticated: true, email: session.email });
});

export { auth };
