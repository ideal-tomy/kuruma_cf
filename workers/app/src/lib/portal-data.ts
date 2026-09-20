import { quoteTotalsForDisplay } from '@kuruma-cf/quote';
import { computeEstimatedMileage, daysUntil } from './mileage';
import { parseQuoteRow } from './quote-db';
import type { CustomerRow, QuoteRow, ServiceHistoryRow, VehicleRow } from '../types';

export type PortalQuoteSummary = {
  quoteNo: string;
  grandTotal: number;
  nonTaxableSubtotal: number;
  validUntil: string | null;
  notes: string | null;
  legalLines: { label: string; amount: number; category?: string }[];
  serviceLines: { label: string; amount: number; category?: string }[];
  printUrl: string | null;
};

export type PortalData = {
  customerName: string;
  maker: string;
  model: string;
  plate: string;
  inspectionExpireDate: string;
  estimatedMileage: number | null;
  daysUntilInspection: number | null;
  histories: ServiceHistoryRow[];
  latestQuote: PortalQuoteSummary | null;
};

export async function loadPortalData(
  db: D1Database,
  customerId: string,
  siteUrl: string,
  quoteShareSecret: string,
  buildQuoteToken: (quoteId: string) => Promise<string>,
): Promise<PortalData | null> {
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(customerId)
    .first<CustomerRow>();
  if (!customer) return null;

  const { results: vehicles } = await db
    .prepare('SELECT * FROM vehicles WHERE customer_id = ? ORDER BY created_at ASC')
    .bind(customerId)
    .all<VehicleRow>();
  const vehicle = vehicles?.[0];
  if (!vehicle) {
    return {
      customerName: customer.name,
      maker: '—',
      model: '—',
      plate: '—',
      inspectionExpireDate: '',
      estimatedMileage: null,
      daysUntilInspection: null,
      histories: [],
      latestQuote: null,
    };
  }

  const estimated = computeEstimatedMileage(
    vehicle.initial_mileage,
    vehicle.initial_mileage_recorded_at,
    vehicle.monthly_avg_km,
  );
  const days = daysUntil(vehicle.inspection_expire_date);

  const { results: histories } = await db
    .prepare(
      `SELECT * FROM service_histories WHERE vehicle_id = ?
       ORDER BY performed_at DESC LIMIT 10`,
    )
    .bind(vehicle.id)
    .all<ServiceHistoryRow>();

  const quoteRow = await db
    .prepare(
      `SELECT * FROM quotes WHERE vehicle_id = ? AND status = 'ISSUED'
       ORDER BY issued_at DESC LIMIT 1`,
    )
    .bind(vehicle.id)
    .first<QuoteRow>();

  let latestQuote: PortalQuoteSummary | null = null;
  if (quoteRow) {
    const parsed = parseQuoteRow(quoteRow);
    const disp = quoteTotalsForDisplay({
      legal_items: parsed.legalItems,
      service_items: parsed.serviceItems,
      taxable_subtotal_ex_tax: parsed.taxableSubtotalExTax,
      tax_amount_10: parsed.taxAmount10,
      non_taxable_subtotal: parsed.nonTaxableSubtotal,
      grand_total: parsed.grandTotal,
      total_amount: parsed.totalAmount,
    });
    const token = quoteShareSecret ? await buildQuoteToken(quoteRow.id) : null;
    latestQuote = {
      quoteNo: quoteRow.quote_no,
      grandTotal: disp.grand_total,
      nonTaxableSubtotal: disp.non_taxable_subtotal,
      validUntil: quoteRow.valid_until,
      notes: quoteRow.notes,
      legalLines: disp.legal.map((i) => ({
        label: i.label,
        amount: i.amount,
        category: i.category,
      })),
      serviceLines: disp.service.map((i) => ({
        label: i.label,
        amount: i.amount,
        category: i.category,
      })),
      printUrl: token ? `${siteUrl}/q/${token}` : null,
    };
  }

  return {
    customerName: customer.name,
    maker: vehicle.maker,
    model: vehicle.model,
    plate: vehicle.plate,
    inspectionExpireDate: vehicle.inspection_expire_date,
    estimatedMileage: estimated,
    daysUntilInspection: days,
    histories: histories ?? [],
    latestQuote,
  };
}
