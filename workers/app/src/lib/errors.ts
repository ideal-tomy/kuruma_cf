import type { Context } from 'hono';
import type { AppEnv } from '../env';

export function badRequest(c: Context<AppEnv>, message: string) {
  return c.json({ error: message }, 400);
}

export function notFound(c: Context<AppEnv>, message = 'Not found') {
  return c.json({ error: message }, 404);
}
