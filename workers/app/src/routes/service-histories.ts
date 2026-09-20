import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';
import type { ServiceHistoryRow } from '../types';

const serviceHistories = new Hono<AppEnv>();

function rowToHistory(row: ServiceHistoryRow) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    title: row.title,
    performedAt: row.performed_at,
    mileage: row.mileage,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

serviceHistories.get('/vehicles/:vehicleId/service-histories', async (c) => {
  const vehicleId = c.req.param('vehicleId');
  const vehicle = await c.env.DB.prepare('SELECT id FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first();
  if (!vehicle) return notFound(c, 'Vehicle not found');

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM service_histories WHERE vehicle_id = ? ORDER BY performed_at DESC',
  )
    .bind(vehicleId)
    .all<ServiceHistoryRow>();

  return c.json({ histories: (results ?? []).map(rowToHistory) });
});

serviceHistories.post('/vehicles/:vehicleId/service-histories', async (c) => {
  const vehicleId = c.req.param('vehicleId');
  const vehicle = await c.env.DB.prepare('SELECT id FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first();
  if (!vehicle) return notFound(c, 'Vehicle not found');

  const body = await c.req.json<{
    title?: string;
    performedAt?: string;
    mileage?: number | null;
    notes?: string | null;
  }>();
  if (!body.title?.trim() || !body.performedAt) {
    return badRequest(c, 'title and performedAt are required');
  }

  const id = newId();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO service_histories (id, vehicle_id, title, performed_at, mileage, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      vehicleId,
      body.title.trim(),
      body.performedAt,
      body.mileage ?? null,
      body.notes?.trim() ?? null,
      ts,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM service_histories WHERE id = ?')
    .bind(id)
    .first<ServiceHistoryRow>();
  return c.json(rowToHistory(row!), 201);
});

export { serviceHistories };
