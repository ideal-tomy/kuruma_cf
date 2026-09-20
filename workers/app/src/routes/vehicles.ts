import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { notFound } from '../lib/errors';
import { nowIso } from '../lib/time';
import { rowToVehicle } from './customers';
import type { VehicleInput, VehicleRow } from '../types';

const vehicles = new Hono<AppEnv>();

vehicles.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(id)
    .first<VehicleRow>();
  if (!existing) return notFound(c, 'Vehicle not found');

  const body = await c.req.json<VehicleInput>();
  const ts = nowIso();
  await c.env.DB.prepare(
    `UPDATE vehicles SET
      maker = ?, model = ?, plate = ?, vin = ?, inspection_expire_date = ?,
      initial_mileage = ?, initial_mileage_recorded_at = ?, monthly_avg_km = ?,
      last_oil_change_mileage = ?, last_oil_change_at = ?, oil_interval_km = ?,
      updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      body.maker?.trim() ?? existing.maker,
      body.model?.trim() ?? existing.model,
      body.plate?.trim() ?? existing.plate,
      body.vin !== undefined ? body.vin?.trim() ?? null : existing.vin,
      body.inspectionExpireDate ?? existing.inspection_expire_date,
      body.initialMileage ?? existing.initial_mileage,
      body.initialMileageRecordedAt ?? existing.initial_mileage_recorded_at,
      body.monthlyAvgKm !== undefined ? body.monthlyAvgKm : existing.monthly_avg_km,
      body.lastOilChangeMileage !== undefined
        ? body.lastOilChangeMileage
        : existing.last_oil_change_mileage,
      body.lastOilChangeAt !== undefined ? body.lastOilChangeAt : existing.last_oil_change_at,
      body.oilIntervalKm ?? existing.oil_interval_km,
      ts,
      id,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(id)
    .first<VehicleRow>();
  return c.json(rowToVehicle(row!));
});

export { vehicles };
