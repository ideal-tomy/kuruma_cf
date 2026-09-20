import { Hono } from 'hono';
import { quoteTotalsForDisplay } from '@kuruma-cf/quote';
import type { AppEnv } from '../env';
import { parseIssuerFromJson } from '../lib/issuer';
import { loadPortalData } from '../lib/portal-data';
import {
  renderCustomerPortal,
  renderOptOutPage,
  renderPortalError,
  renderQuoteDocument,
} from '../lib/portal-html';
import { parseQuoteRow } from '../lib/quote-db';
import {
  buildQuoteShareToken,
  verifyCustomerPortalToken,
  verifyOptOutToken,
  verifyQuoteShareToken,
} from '../lib/tokens';
import { newId } from '../lib/ids';
import { nowIso } from '../lib/time';
import type { CustomerRow, QuoteRow, VehicleRow } from '../types';

const portal = new Hono<AppEnv>();

portal.get('/p/:token', async (c) => {
  const secret = c.env.CUSTOMER_PORTAL_SECRET;
  if (!secret) {
    return c.html(renderPortalError('ポータル未設定', 'CUSTOMER_PORTAL_SECRET を設定してください'), 503);
  }

  const decoded = await verifyCustomerPortalToken(secret, c.req.param('token'));
  if (!decoded) {
    return c.html(
      renderPortalError(
        'リンクが無効です',
        'URL の有効期限が切れているか、不正なリンクです。店舗までお問い合わせください。',
      ),
      404,
    );
  }

  const site = (c.env.SITE_URL ?? 'http://localhost:8788').replace(/\/$/, '');
  const data = await loadPortalData(
    c.env.DB,
    decoded.customerId,
    site,
    c.env.QUOTE_SHARE_SECRET ?? '',
    (quoteId) => buildQuoteShareToken(c.env.QUOTE_SHARE_SECRET!, quoteId),
  );
  if (!data) return c.html(renderPortalError('お客様情報が見つかりません'), 404);

  const issuer = parseIssuerFromJson(c.env.ISSUER_JSON);
  return c.html(renderCustomerPortal(data, issuer));
});

portal.get('/q/:token', async (c) => {
  const secret = c.env.QUOTE_SHARE_SECRET;
  if (!secret) {
    return c.html(renderPortalError('見積リンク未設定'), 503);
  }

  const decoded = await verifyQuoteShareToken(secret, c.req.param('token'));
  if (!decoded) {
    return c.html(
      renderPortalError(
        'リンクが無効です',
        'URL の有効期限が切れているか、不正なリンクです。店舗までお問い合わせください。',
      ),
      404,
    );
  }

  const quoteRow = await c.env.DB.prepare('SELECT * FROM quotes WHERE id = ?')
    .bind(decoded.quoteId)
    .first<QuoteRow>();
  if (!quoteRow) return c.html(renderPortalError('見積が見つかりません'), 404);

  const vehicle = await c.env.DB.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(quoteRow.vehicle_id)
    .first<VehicleRow>();
  if (!vehicle) return c.html(renderPortalError('車両情報がありません'), 404);

  const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(vehicle.customer_id)
    .first<CustomerRow>();

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

  const issuer = parseIssuerFromJson(c.env.ISSUER_JSON);
  return c.html(
    renderQuoteDocument({
      issuer,
      customerName: customer?.name ?? 'お客様',
      maker: vehicle.maker,
      model: vehicle.model,
      plate: vehicle.plate,
      quoteNo: quoteRow.quote_no,
      issuedAt: quoteRow.issued_at,
      validUntil: quoteRow.valid_until,
      notes: quoteRow.notes,
      legal: disp.legal,
      service: disp.service,
      taxableSubtotalExTax: disp.taxable_subtotal_ex_tax,
      taxAmount10: disp.tax_amount_10,
      nonTaxableSubtotal: disp.non_taxable_subtotal,
      grandTotal: disp.grand_total,
    }),
  );
});

portal.get('/u/:token', async (c) => {
  const secret = c.env.OPT_OUT_SECRET;
  if (!secret) {
    return c.html(renderPortalError('配信停止リンク未設定'), 503);
  }

  const decoded = await verifyOptOutToken(secret, c.req.param('token'));
  if (!decoded) {
    return c.html(
      renderPortalError(
        '配信停止リンクが無効です',
        'URL の有効期限が切れているか、不正なリンクです。',
      ),
      404,
    );
  }

  const customer = await c.env.DB.prepare('SELECT id, name FROM customers WHERE id = ?')
    .bind(decoded.customerId)
    .first<Pick<CustomerRow, 'id' | 'name'>>();

  const confirmed = c.req.query('confirm') === '1';
  if (confirmed) {
    const ts = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO consents (id, customer_id, channel, opt_in, opt_out_at, source, updated_at)
       VALUES (?, ?, ?, 0, ?, 'public_link', ?)
       ON CONFLICT(customer_id, channel) DO UPDATE SET
         opt_in = 0, opt_out_at = excluded.opt_out_at, source = excluded.source, updated_at = excluded.updated_at`,
    )
      .bind(newId(), decoded.customerId, decoded.channel, ts, ts)
      .run();
  }

  return c.html(
    renderOptOutPage({
      customerName: customer?.name ?? 'お客様',
      channel: decoded.channel,
      token: c.req.param('token'),
      confirmed,
    }),
  );
});

export { portal };
