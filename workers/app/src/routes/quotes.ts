import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, notFound } from '../lib/errors';
import {
  insertIssuedQuote,
  loadStatutoryRates,
  parseQuoteRow,
  updateQuoteLines,
} from '../lib/quote-db';
import { buildCustomerPortalToken, buildOptOutToken, buildQuoteShareToken } from '../lib/tokens';
import type { QuoteRow, VehicleRow } from '../types';

const quotes = new Hono<AppEnv>();

function siteUrl(c: { env: AppEnv['Bindings'] }): string {
  return (c.env.SITE_URL ?? 'http://localhost:8788').replace(/\/$/, '');
}

quotes.get('/vehicle/:vehicleId', async (c) => {
  const vehicleId = c.req.param('vehicleId');
  const vehicle = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first<VehicleRow>();
  if (!vehicle) return notFound(c, '車両が見つかりません');

  const { results: quoteRows } = await c.env.DB.prepare(
    'SELECT * FROM quotes WHERE vehicle_id = ? ORDER BY created_at DESC',
  )
    .bind(vehicleId)
    .all<QuoteRow>();

  const base = siteUrl(c);
  const shareUrlsByQuoteId: Record<string, string | null> = {};
  for (const q of quoteRows ?? []) {
    if (c.env.QUOTE_SHARE_SECRET) {
      const token = await buildQuoteShareToken(c.env.QUOTE_SHARE_SECRET, q.id);
      shareUrlsByQuoteId[q.id] = `${base}/q/${token}`;
    } else {
      shareUrlsByQuoteId[q.id] = null;
    }
  }

  let portalUrl: string | null = null;
  let optOutUrl: string | null = null;
  if (c.env.CUSTOMER_PORTAL_SECRET) {
    const token = await buildCustomerPortalToken(c.env.CUSTOMER_PORTAL_SECRET, vehicle.customer_id);
    portalUrl = `${base}/p/${token}`;
  }
  if (c.env.OPT_OUT_SECRET) {
    const token = await buildOptOutToken(c.env.OPT_OUT_SECRET, vehicle.customer_id, 'LINE');
    optOutUrl = `${base}/u/${token}`;
  }

  return c.json({
    vehicle: {
      id: vehicle.id,
      customerId: vehicle.customer_id,
      maker: vehicle.maker,
      model: vehicle.model,
      plate: vehicle.plate,
      inspectionExpireDate: vehicle.inspection_expire_date,
    },
    quotes: (quoteRows ?? []).map(parseQuoteRow),
    shareUrlsByQuoteId,
    portalUrl,
    optOutUrl,
  });
});

quotes.post('/generate', async (c) => {
  const body = await c.req.json<{ vehicleId?: string; includeOil?: boolean; notesAppend?: string }>();
  if (!body.vehicleId) return badRequest(c, 'vehicleId is required');

  const vehicle = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(body.vehicleId)
    .first<VehicleRow>();
  if (!vehicle) return notFound(c, 'vehicle not found');

  const rates = await loadStatutoryRates(c.env.DB);
  const result = await insertIssuedQuote(c.env.DB, vehicle, rates, {
    includeOilChange: body.includeOil ?? false,
    notesAppend: body.notesAppend,
  });

  return c.json(result, 201);
});

quotes.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    legal_items?: unknown[];
    service_items?: unknown[];
    notes?: string | null;
    status?: string;
  }>();

  if (!body.legal_items || !body.service_items) {
    return badRequest(c, 'legal_items and service_items are required');
  }

  const result = await updateQuoteLines(c.env.DB, id, {
    legal_items: body.legal_items,
    service_items: body.service_items,
    notes: body.notes,
    status: body.status,
  });

  if ('error' in result) {
    return c.json({ error: result.error }, result.status as 400 | 404 | 409);
  }

  return c.json({ ok: true, grandTotal: result.grandTotal });
});

export { quotes };
