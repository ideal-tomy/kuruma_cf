import {
  buildQuoteFromVehicle,
  computeTotalsFromParts,
  normalizeQuoteLineItem,
  normalizeQuoteSections,
  quoteTotalsForDb,
  rowsFromStoredJson,
  type QuoteLineItem,
} from '@kuruma-cf/quote';
import type { StatutoryFeeRateRow } from '@kuruma-cf/quote';
import { newId } from './ids';
import { nowIso, todayDate } from './time';
import type { QuoteRow, VehicleRow } from '../types';

export function parseQuoteRow(row: QuoteRow) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    quoteNo: row.quote_no,
    status: row.status,
    totalAmount: row.total_amount,
    legalItems: rowsFromStoredJson(JSON.parse(row.legal_items || '[]')),
    serviceItems: rowsFromStoredJson(JSON.parse(row.service_items || '[]')),
    notes: row.notes,
    validUntil: row.valid_until,
    issuedAt: row.issued_at,
    taxableSubtotalExTax: row.taxable_subtotal_ex_tax,
    taxAmount10: row.tax_amount_10,
    nonTaxableSubtotal: row.non_taxable_subtotal,
    grandTotal: row.grand_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadStatutoryRates(db: D1Database): Promise<StatutoryFeeRateRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM statutory_fee_rates ORDER BY effective_from DESC')
    .all<StatutoryFeeRateRow>();
  return results ?? [];
}

export async function insertIssuedQuote(
  db: D1Database,
  vehicle: VehicleRow,
  rates: StatutoryFeeRateRow[],
  opts?: { includeOilChange?: boolean; notesAppend?: string },
): Promise<{ id: string; grandTotal: number }> {
  const specs = vehicle.vehicle_specs ? JSON.parse(vehicle.vehicle_specs) : {};
  const estimate = buildQuoteFromVehicle({
    vehicleSpecs: specs,
    statutoryRates: rates,
    asOfDate: todayDate(),
    includeOilChange: opts?.includeOilChange ?? false,
    notesAppend: opts?.notesAppend,
  });

  const id = newId();
  const ts = nowIso();
  const quoteNo = `QT-${new Date().getFullYear()}-${vehicle.id.slice(0, 8)}-${Date.now().toString(36)}`;
  const taxCols = quoteTotalsForDb(estimate);

  await db
    .prepare(
      `INSERT INTO quotes (
        id, vehicle_id, quote_no, status, total_amount, legal_items, service_items, notes,
        valid_until, issued_at, taxable_subtotal_ex_tax, tax_amount_10, non_taxable_subtotal,
        grand_total, created_at, updated_at
      ) VALUES (?, ?, ?, 'ISSUED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      vehicle.id,
      quoteNo,
      taxCols.total_amount,
      JSON.stringify(estimate.legal_items),
      JSON.stringify(estimate.service_items),
      estimate.notes,
      vehicle.inspection_expire_date,
      ts,
      taxCols.taxable_subtotal_ex_tax,
      taxCols.tax_amount_10,
      taxCols.non_taxable_subtotal,
      taxCols.grand_total,
      ts,
      ts,
    )
    .run();

  return { id, grandTotal: estimate.grand_total };
}

export function toLineItems(rows: unknown[]): QuoteLineItem[] {
  const out: QuoteLineItem[] = [];
  for (const r of rows) {
    const n = normalizeQuoteLineItem(r);
    if (n) out.push(n);
  }
  return out;
}

export async function updateQuoteLines(
  db: D1Database,
  quoteId: string,
  body: {
    legal_items: unknown[];
    service_items: unknown[];
    notes?: string | null;
    status?: string;
  },
): Promise<{ grandTotal: number } | { error: string; status: number }> {
  const existing = await db.prepare('SELECT * FROM quotes WHERE id = ?')
    .bind(quoteId)
    .first<QuoteRow>();
  if (!existing) return { error: 'quote not found', status: 404 };
  if (!['DRAFT', 'ISSUED'].includes(existing.status)) {
    return { error: 'この状態の見積は編集できません', status: 409 };
  }

  const { legal_items: legal, service_items: service } = normalizeQuoteSections(
    toLineItems(body.legal_items),
    toLineItems(body.service_items),
  );
  if (legal.length === 0 && service.length === 0) {
    return { error: '明細が空です', status: 400 };
  }

  const totals = computeTotalsFromParts(legal, service);
  const ts = nowIso();
  const nextStatus = body.status ?? existing.status;

  await db
    .prepare(
      `UPDATE quotes SET
        legal_items = ?, service_items = ?, notes = ?, status = ?,
        total_amount = ?, grand_total = ?, taxable_subtotal_ex_tax = ?,
        tax_amount_10 = ?, non_taxable_subtotal = ?, updated_at = ?,
        issued_at = CASE WHEN ? = 'ISSUED' AND issued_at IS NULL THEN ? ELSE issued_at END
       WHERE id = ?`,
    )
    .bind(
      JSON.stringify(legal),
      JSON.stringify(service),
      body.notes !== undefined ? body.notes : existing.notes,
      nextStatus,
      totals.grand_total,
      totals.grand_total,
      totals.taxable_subtotal_ex_tax,
      totals.tax_amount_10,
      totals.non_taxable_subtotal,
      ts,
      nextStatus,
      ts,
      quoteId,
    )
    .run();

  return { grandTotal: totals.grand_total };
}
