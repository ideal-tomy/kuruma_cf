import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, notFound } from '../lib/errors';
import { newId } from '../lib/ids';
import { nowIso, todayDate } from '../lib/time';
import type { CustomerInput, CustomerRow, VehicleInput, VehicleRow } from '../types';

const customers = new Hono<AppEnv>();

type CustomerListRow = CustomerRow & {
  primary_plate: string | null;
  primary_maker: string | null;
  primary_model: string | null;
};

function rowToCustomer(row: CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    furigana: row.furigana,
    phone: row.phone,
    email: row.email,
    lineUserId: row.line_user_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCustomerListItem(row: CustomerListRow) {
  const maker = row.primary_maker?.trim();
  const model = row.primary_model?.trim();
  return {
    ...rowToCustomer(row),
    primaryPlate: row.primary_plate,
    primaryVehicleLabel: maker && model ? `${maker} ${model}` : null,
  };
}

const CUSTOMER_LIST_SELECT = `
  SELECT c.*,
    (SELECT plate FROM vehicles WHERE customer_id = c.id ORDER BY plate ASC LIMIT 1) AS primary_plate,
    (SELECT maker FROM vehicles WHERE customer_id = c.id ORDER BY plate ASC LIMIT 1) AS primary_maker,
    (SELECT model FROM vehicles WHERE customer_id = c.id ORDER BY plate ASC LIMIT 1) AS primary_model
  FROM customers c
`;

function rowToVehicle(row: VehicleRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    maker: row.maker,
    model: row.model,
    plate: row.plate,
    vin: row.vin,
    inspectionExpireDate: row.inspection_expire_date,
    initialMileage: row.initial_mileage,
    initialMileageRecordedAt: row.initial_mileage_recorded_at,
    monthlyAvgKm: row.monthly_avg_km,
    lastOilChangeMileage: row.last_oil_change_mileage,
    lastOilChangeAt: row.last_oil_change_at,
    oilIntervalKm: row.oil_interval_km,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

customers.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  let stmt;
  if (q) {
    const like = `%${q}%`;
    stmt = c.env.DB.prepare(
      `${CUSTOMER_LIST_SELECT}
       WHERE c.status != 'INACTIVE' AND (
         c.name LIKE ? OR c.furigana LIKE ? OR c.phone LIKE ?
         OR EXISTS (SELECT 1 FROM vehicles v WHERE v.customer_id = c.id AND v.plate LIKE ?)
       )
       ORDER BY c.name ASC`,
    ).bind(like, like, like, like);
  } else {
    stmt = c.env.DB.prepare(
      `${CUSTOMER_LIST_SELECT}
       WHERE c.status != 'INACTIVE'
       ORDER BY c.name ASC`,
    );
  }

  const { results } = await stmt.all<CustomerListRow>();
  return c.json({ customers: (results ?? []).map(rowToCustomerListItem) });
});

customers.post('/', async (c) => {
  const body = await c.req.json<CustomerInput>();
  if (!body.name?.trim()) return badRequest(c, 'name is required');

  const id = newId();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO customers (
      id, name, furigana, phone, email, line_user_id, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.name.trim(),
      body.furigana?.trim() ?? null,
      body.phone?.trim() ?? null,
      body.email?.trim() ?? null,
      body.lineUserId?.trim() ?? null,
      body.status ?? 'ACTIVE',
      body.notes?.trim() ?? null,
      ts,
      ts,
    )
    .run();

  if (body.lineUserId?.trim()) {
    await c.env.DB.prepare('DELETE FROM line_unmatched WHERE line_user_id = ?')
      .bind(body.lineUserId.trim())
      .run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
    .first<CustomerRow>();
  return c.json(rowToCustomer(row!), 201);
});

customers.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
    .first<CustomerRow>();
  if (!row) return notFound(c, 'Customer not found');

  const { results: vehicleRows } = await c.env.DB.prepare(
    'SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at ASC',
  )
    .bind(id)
    .all<VehicleRow>();

  return c.json({
    ...rowToCustomer(row),
    vehicles: (vehicleRows ?? []).map(rowToVehicle),
  });
});

customers.post('/:id/vehicles', async (c) => {
  const customerId = c.req.param('id');
  const customer = await c.env.DB.prepare('SELECT id FROM customers WHERE id = ?')
    .bind(customerId)
    .first();
  if (!customer) return notFound(c, 'Customer not found');

  const body = await c.req.json<VehicleInput>();
  if (!body.maker?.trim() || !body.model?.trim() || !body.plate?.trim()) {
    return badRequest(c, 'maker, model, plate are required');
  }
  if (!body.inspectionExpireDate) return badRequest(c, 'inspectionExpireDate is required');

  const id = newId();
  const ts = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO vehicles (
      id, customer_id, maker, model, plate, vin, inspection_expire_date,
      initial_mileage, initial_mileage_recorded_at, monthly_avg_km,
      last_oil_change_mileage, last_oil_change_at, oil_interval_km,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      customerId,
      body.maker.trim(),
      body.model.trim(),
      body.plate.trim(),
      body.vin?.trim() ?? null,
      body.inspectionExpireDate,
      body.initialMileage ?? 0,
      body.initialMileageRecordedAt ?? todayDate(),
      body.monthlyAvgKm ?? null,
      body.lastOilChangeMileage ?? null,
      body.lastOilChangeAt ?? null,
      body.oilIntervalKm ?? 4000,
      ts,
      ts,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(id)
    .first<VehicleRow>();
  return c.json(rowToVehicle(row!), 201);
});

customers.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
    .first<CustomerRow>();
  if (!existing) return notFound(c, 'Customer not found');

  const body = await c.req.json<CustomerInput>();
  const ts = nowIso();
  await c.env.DB.prepare(
    `UPDATE customers SET
      name = ?, furigana = ?, phone = ?, email = ?, line_user_id = ?,
      status = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      body.name?.trim() ?? existing.name,
      body.furigana !== undefined ? body.furigana?.trim() ?? null : existing.furigana,
      body.phone !== undefined ? body.phone?.trim() ?? null : existing.phone,
      body.email !== undefined ? body.email?.trim() ?? null : existing.email,
      body.lineUserId !== undefined ? body.lineUserId?.trim() ?? null : existing.line_user_id,
      body.status ?? existing.status,
      body.notes !== undefined ? body.notes?.trim() ?? null : existing.notes,
      ts,
      id,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(id)
    .first<CustomerRow>();
  return c.json(rowToCustomer(row!));
});

export { customers, rowToVehicle };
