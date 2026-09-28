import {
  isInspectionBase,
  QUOTE_SECTION_LABEL,
  type QuoteLineItem,
} from '@kuruma-cf/quote';
import type { IssuerProfile } from './issuer';
import type { PortalData } from './portal-data';

const PORTAL_CSS = `
:root { --accent: #2d4a3e; --accent-soft: #e6eee9; --bg: #f5f3ef; --surface: #fff; --ink: #1a1a1a; --ink-2: #374151; --muted: #6b7280; --line: #e5e7eb; --warn-bg: #fef3c7; --warn-border: #fcd34d; --warn-ink: #92400e; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; background: var(--bg); color: var(--ink); font-size: 16px; line-height: 1.7; -webkit-text-size-adjust: 100%; }
h1, h2, h3 { word-break: keep-all; overflow-wrap: anywhere; }
.shell { max-width: 720px; margin: 0 auto; padding: 16px 16px 40px; min-height: 100vh; }
.card { background: var(--surface); border-radius: 16px; padding: 20px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
@media (min-width: 640px) { .shell { padding: 32px 24px 56px; } .card { padding: 24px; } }
.shop { font-size: 14px; color: var(--muted); margin: 0; }
.greeting { font-size: 18px; font-weight: 700; margin: 4px 0 0; }
.hero-caption { font-size: 15px; color: var(--ink-2); margin: 16px 0 0; }
.hero-total { font-size: 36px; font-weight: 800; color: var(--accent); line-height: 1.2; margin: 4px 0 0; font-variant-numeric: tabular-nums; }
.hero-total small { font-size: 18px; font-weight: 700; margin-left: 2px; }
.hero-note { font-size: 14px; color: var(--muted); margin: 4px 0 0; }
.car { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
.car-name { font-size: 18px; font-weight: 700; margin: 0; }
.car-plate { font-size: 16px; font-weight: 700; color: var(--accent); margin: 2px 0 0; }
.chip { display: inline-block; margin-top: 12px; padding: 6px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 15px; font-weight: 700; }
.chip-warn { background: var(--warn-bg); color: var(--warn-ink); border: 1px solid var(--warn-border); }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.fact-label { font-size: 14px; color: var(--muted); margin: 0; }
.fact-val { font-size: 18px; font-weight: 700; margin: 0; font-variant-numeric: tabular-nums; }
.card-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.group { margin-top: 20px; }
.group:first-of-type { margin-top: 12px; }
.group-title { font-size: 16px; font-weight: 700; color: var(--accent); margin: 0 0 4px; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.row-label { min-width: 0; }
.row-amount { white-space: nowrap; font-weight: 600; font-variant-numeric: tabular-nums; }
.subtotal { display: flex; justify-content: space-between; padding: 8px 0 0; font-size: 15px; color: var(--ink-2); }
.grand { display: flex; justify-content: space-between; align-items: baseline; margin-top: 20px; padding-top: 16px; border-top: 2px solid var(--ink); }
.grand-label { font-size: 16px; font-weight: 700; }
.grand-amount { font-size: 24px; font-weight: 800; color: var(--accent); font-variant-numeric: tabular-nums; }
.tax-note { font-size: 14px; color: var(--muted); margin: 4px 0 0; text-align: right; }
.notes { margin: 16px 0 0; padding: 12px; border-radius: 12px; background: #f9fafb; font-size: 14px; color: var(--ink-2); white-space: pre-wrap; }
.meta-list { margin: 12px 0 0; font-size: 14px; color: var(--muted); }
.actions { margin: 16px 0 12px; }
.btn { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 52px; padding: 12px 16px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 17px; border: none; cursor: pointer; font-family: inherit; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-outline { background: var(--surface); color: var(--accent); border: 1px solid var(--accent); }
.btn-danger { background: #b91c1c; color: #fff; }
.btn + .btn { margin-top: 8px; }
.text-link { display: block; text-align: center; padding: 12px 0; color: var(--accent); font-size: 15px; font-weight: 600; }
.staff-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 12px 16px; border-radius: 12px; background: #1f2937; color: #fff; font-size: 14px; }
.staff-bar a { flex-shrink: 0; padding: 8px 14px; border-radius: 10px; background: #fff; color: #1f2937; font-weight: 700; text-decoration: none; }
.timeline-item { padding: 10px 0; border-bottom: 1px solid var(--line); }
.timeline-date { font-size: 14px; color: var(--muted); }
.error-card { text-align: center; padding: 32px 16px; }
.title { font-size: 20px; font-weight: 700; margin: 4px 0 12px; }
.print-only { display: none; }
.print-doc h1 { text-align: center; font-size: 22px; margin: 0 0 16px; }
.print-meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; font-size: 12px; }
.print-meta p { margin: 0; }
.print-doc table { width: 100%; border-collapse: collapse; font-size: 12px; }
.print-doc th, .print-doc td { border: 1px solid #999; padding: 4px 6px; }
.print-doc th { background: #f3f4f6; }
.print-doc .num { text-align: right; white-space: nowrap; }
.print-doc .cat-row td { background: #f3f4f6; font-weight: 700; }
.print-totals { margin-top: 12px; text-align: right; font-size: 12px; }
.print-totals .print-grand { font-size: 16px; font-weight: 700; }
.print-notes { margin-top: 12px; font-size: 11px; white-space: pre-wrap; }
@media print {
  @page { margin: 12mm; }
  body { background: #fff; font-size: 12px; line-height: 1.5; }
  .no-print, .screen-only { display: none !important; }
  .print-only { display: block; }
  .shell { max-width: none; padding: 0; min-height: 0; }
  .card { box-shadow: none; padding: 0; margin: 0 0 12px; border-radius: 0; }
}
`;

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function yen(n: number): string {
  return `${n.toLocaleString('ja-JP')}円`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${y}/${m}/${d}` : iso.slice(0, 10);
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${PORTAL_CSS}</style></head><body>${body}</body></html>`;
}

export function renderPortalError(title: string, message?: string): string {
  return layout(
    title,
    `<div class="shell"><div class="card error-card"><h1 class="title">${esc(title)}</h1>${message ? `<p>${esc(message)}</p>` : ''}</div></div>`,
  );
}

function withStaffPreview(url: string, staffPreview: boolean): string {
  if (!staffPreview) return url;
  return url.includes('?') ? `${url}&preview=1` : `${url}?preview=1`;
}

type DisplayLine = {
  label: string;
  amount: number;
  category?: string;
};

const CUSTOMER_LEGAL_HEADING = '税金・保険など（消費税なし）';
const CUSTOMER_SERVICE_HEADING = '点検・整備（税込）';

function staffBar(editHref: string | null | undefined): string {
  if (!editHref) return '';
  return `<div class="staff-bar no-print"><span>スタッフ確認用の表示です。<br>お客様には出ません。</span><a href="${esc(editHref)}">見積を編集</a></div>`;
}

function inspectionChip(days: number | null, expireDate: string): string {
  if (days == null) return '';
  if (days < 0) {
    return `<span class="chip chip-warn">車検の期限が過ぎています（${esc(fmtDate(expireDate))}）</span>`;
  }
  const warn = days <= 90 ? ' chip-warn' : '';
  return `<span class="chip${warn}">車検まで あと${days}日（${esc(fmtDate(expireDate))}）</span>`;
}

function renderLines(lines: DisplayLine[]): string {
  return lines
    .map(
      (l) =>
        `<div class="row"><span class="row-label">${esc(l.label)}</span><span class="row-amount">${yen(l.amount)}</span></div>`,
    )
    .join('');
}

function sumAmount(lines: DisplayLine[]): number {
  return lines.reduce((a, l) => a + l.amount, 0);
}

function renderBreakdown(args: {
  legal: DisplayLine[];
  service: DisplayLine[];
  grandTotal: number;
  taxAmount10?: number;
}): string {
  const inspection = args.service.filter((l) => isInspectionBase(l));
  const others = args.service.filter((l) => !isInspectionBase(l));
  const service = [...inspection, ...others];
  const legalHtml =
    args.legal.length > 0
      ? `<div class="group"><h3 class="group-title">${CUSTOMER_LEGAL_HEADING}</h3>${renderLines(args.legal)}<div class="subtotal"><span>小計</span><span>${yen(sumAmount(args.legal))}</span></div></div>`
      : '';
  const serviceHtml =
    service.length > 0
      ? `<div class="group"><h3 class="group-title">${CUSTOMER_SERVICE_HEADING}</h3>${renderLines(service)}<div class="subtotal"><span>小計</span><span>${yen(sumAmount(service))}</span></div></div>`
      : '';
  return `${legalHtml}${serviceHtml}
    <div class="grand"><span class="grand-label">お支払い合計</span><span class="grand-amount">${yen(args.grandTotal)}</span></div>
    ${args.taxAmount10 ? `<p class="tax-note">うち消費税 ${yen(args.taxAmount10)}</p>` : ''}`;
}

function contactActions(issuer: IssuerProfile | null, printHref: string | null): string {
  const phone = issuer?.phone
    ? `<a class="btn btn-primary" href="tel:${esc(issuer.phone.replace(/[^\d+]/g, ''))}">お店に電話する</a>`
    : '';
  const print = printHref ? `<a class="text-link" href="${esc(printHref)}">見積書を印刷・保存する</a>` : '';
  if (!phone && !print) return '';
  return `<div class="actions no-print">${phone}${print}</div>`;
}

export function renderCustomerPortal(
  data: PortalData,
  issuer: IssuerProfile | null,
  editHref?: string | null,
): string {
  const days = data.daysUntilInspection;
  const q = data.latestQuote;
  const printHref = q?.printUrl ? withStaffPreview(q.printUrl, Boolean(editHref)) : null;

  const heroTotal = q
    ? `<p class="hero-caption">お見積の合計（税込）</p>
       <p class="hero-total">${q.grandTotal.toLocaleString('ja-JP')}<small>円</small></p>
       ${q.validUntil ? `<p class="hero-note">${esc(fmtDate(q.validUntil))}まで有効</p>` : ''}`
    : `<p class="hero-caption">お見積の準備ができましたら、LINE でお知らせします。</p>`;

  const breakdownHtml = q
    ? `<section class="card" id="quote">
        <h2 class="card-title">お見積の内訳</h2>
        ${renderBreakdown({ legal: q.legalLines, service: q.serviceLines, grandTotal: q.grandTotal })}
        ${q.notes ? `<p class="notes">${esc(q.notes)}</p>` : ''}
      </section>`
    : '';

  const historyHtml =
    data.histories.length > 0
      ? `<section class="card" id="history">
          <h2 class="card-title">これまでの整備</h2>
          ${data.histories
            .map(
              (h) =>
                `<div class="timeline-item"><div class="timeline-date">${esc(fmtDate(h.performed_at))}${h.mileage ? `（走行距離 ${h.mileage.toLocaleString('ja-JP')}キロ）` : ''}</div><div>${esc(h.title)}</div></div>`,
            )
            .join('')}
        </section>`
      : '';

  const mileageHtml =
    data.estimatedMileage != null
      ? `<div class="facts"><div><p class="fact-label">走行距離の目安</p><p class="fact-val">約${data.estimatedMileage.toLocaleString('ja-JP')}キロ</p></div></div>`
      : '';

  return layout(
    `${data.customerName} 様のお見積`,
    `<div class="shell">
      ${staffBar(editHref)}
      <section class="card">
        ${issuer?.companyName ? `<p class="shop">${esc(issuer.companyName)}</p>` : ''}
        <h1 class="greeting">${esc(data.customerName)} 様</h1>
        ${heroTotal}
        <div class="car">
          <p class="car-name">${esc(data.maker)} ${esc(data.model)}</p>
          <p class="car-plate">${esc(data.plate)}</p>
          ${inspectionChip(days, data.inspectionExpireDate)}
          ${mileageHtml}
        </div>
      </section>
      ${contactActions(issuer, printHref)}
      ${breakdownHtml}
      ${historyHtml}
    </div>`,
  );
}

export function renderQuoteDocument(args: {
  issuer: IssuerProfile | null;
  editHref?: string | null;
  customerName: string;
  maker: string;
  model: string;
  plate: string;
  quoteNo: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  notes: string | null;
  legal: QuoteLineItem[];
  service: QuoteLineItem[];
  taxableSubtotalExTax: number;
  taxAmount10: number;
  nonTaxableSubtotal: number;
  grandTotal: number;
}): string {
  const inspection = args.service.filter(isInspectionBase);
  const additional = args.service.filter((i) => !isInspectionBase(i));

  const lineRows = (items: QuoteLineItem[]) =>
    items
      .map(
        (i) =>
          `<tr><td>${esc(i.label)}</td><td class="num">${i.quantity}</td><td class="num">${i.unit_price.toLocaleString('ja-JP')}</td><td class="num">${i.amount.toLocaleString('ja-JP')}</td></tr>`,
      )
      .join('');

  const issuerHtml = args.issuer
    ? `<div><strong>${esc(args.issuer.companyName)}</strong>
        ${args.issuer.representative ? `<div>代表 ${esc(args.issuer.representative)}</div>` : ''}
        ${args.issuer.address ? `<div>${args.issuer.postalCode ? `〒${esc(args.issuer.postalCode)} ` : ''}${esc(args.issuer.address)}</div>` : ''}
        ${args.issuer.phone ? `<div>TEL ${esc(args.issuer.phone)}</div>` : ''}
      </div>`
    : '';

  const phone = args.issuer?.phone
    ? `<a class="btn btn-primary" href="tel:${esc(args.issuer.phone.replace(/[^\d+]/g, ''))}">お店に電話する</a>`
    : '';

  const screenHtml = `<div class="screen-only">
      ${staffBar(args.editHref)}
      <section class="card">
        ${args.issuer?.companyName ? `<p class="shop">${esc(args.issuer.companyName)}</p>` : ''}
        <h1 class="greeting">${esc(args.customerName)} 様　お見積書</h1>
        <p class="hero-caption">お見積の合計（税込）</p>
        <p class="hero-total">${args.grandTotal.toLocaleString('ja-JP')}<small>円</small></p>
        ${args.validUntil ? `<p class="hero-note">${esc(fmtDate(args.validUntil))}まで有効</p>` : ''}
        <div class="car">
          <p class="car-name">${esc(args.maker)} ${esc(args.model)}</p>
          <p class="car-plate">${esc(args.plate)}</p>
        </div>
      </section>
      <div class="actions">
        ${phone}
        <button type="button" class="btn btn-outline" onclick="window.print()">印刷・PDFで保存する</button>
      </div>
      <section class="card">
        <h2 class="card-title">お見積の内訳</h2>
        ${renderBreakdown({ legal: args.legal, service: args.service, grandTotal: args.grandTotal, taxAmount10: args.taxAmount10 })}
        ${args.notes ? `<p class="notes">${esc(args.notes)}</p>` : ''}
        <p class="meta-list">見積番号 ${esc(args.quoteNo)}　発行日 ${esc(fmtDate(args.issuedAt))}</p>
      </section>
      ${issuerHtml ? `<section class="card"><h2 class="card-title">お見積の発行元</h2>${issuerHtml}</section>` : ''}
    </div>`;

  const printHtml = `<div class="print-only print-doc">
      <h1>見積書</h1>
      <div class="print-meta">
        <div>
          <p><strong>${esc(args.customerName)} 様</strong></p>
          <p>件名: 車検・点検整備</p>
          <p>${esc(args.maker)} ${esc(args.model)}　${esc(args.plate)}</p>
          <p style="font-size:16px;font-weight:700;margin-top:8px">お見積金額 ${yen(args.grandTotal)}（税込）</p>
        </div>
        <div>
          ${issuerHtml}
          <p style="margin-top:8px">見積番号 ${esc(args.quoteNo)}<br>発行日 ${esc(fmtDate(args.issuedAt))}<br>有効期限 ${esc(fmtDate(args.validUntil))}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>品名</th><th class="num">数量</th><th class="num">単価</th><th class="num">金額</th></tr></thead>
        <tbody>
          <tr class="cat-row"><td colspan="4">${CUSTOMER_LEGAL_HEADING}</td></tr>
          ${lineRows(args.legal)}
          <tr class="cat-row"><td colspan="4">${esc(QUOTE_SECTION_LABEL.inspection)}（税込）</td></tr>
          ${lineRows(inspection)}
          ${additional.length > 0 ? `<tr class="cat-row"><td colspan="4">${esc(QUOTE_SECTION_LABEL.additional)}（税込）</td></tr>${lineRows(additional)}` : ''}
        </tbody>
      </table>
      <div class="print-totals">
        <div>税金・保険など 小計 ${yen(args.nonTaxableSubtotal)}</div>
        <div>点検・整備 本体 ${yen(args.taxableSubtotalExTax)}　消費税 ${yen(args.taxAmount10)}</div>
        <div class="print-grand">合計 ${yen(args.grandTotal)}</div>
      </div>
      ${args.notes ? `<p class="print-notes">${esc(args.notes)}</p>` : ''}
    </div>`;

  return layout('お見積書', `<div class="shell">${screenHtml}${printHtml}</div>`);
}

export function renderOptOutPage(args: {
  customerName: string;
  channel: string;
  token: string;
  confirmed: boolean;
}): string {
  if (args.confirmed) {
    return layout(
      '配信を停止しました',
      `<div class="shell"><div class="card error-card"><h1 class="title">配信を停止しました</h1><p>${esc(args.customerName)} 様の ${esc(args.channel)} 通知を停止しました。<br>再開をご希望の場合は店舗までご連絡ください。</p></div></div>`,
    );
  }
  return layout(
    '配信停止',
    `<div class="shell"><div class="card">
      <h1 class="title">配信停止</h1>
      <p>${esc(args.customerName)} 様の ${esc(args.channel)} 通知を停止します。</p>
      <form method="GET" style="margin-top:20px">
        <input type="hidden" name="confirm" value="1">
        <button type="submit" class="btn btn-danger">配信を停止する</button>
      </form>
    </div></div>`,
  );
}
