import {
  isInspectionBase,
  QUOTE_SECTION_LABEL,
  type QuoteLineItem,
} from '@kuruma-cf/quote';
import type { IssuerProfile } from './issuer';
import type { PortalData } from './portal-data';

const PORTAL_CSS = `
:root { --accent: #2d4a3e; --bg: #f5f3ef; --surface: #fff; --ink: #1a1a1a; --muted: #6b7280; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.5; }
.shell { max-width: 420px; margin: 0 auto; padding: 16px; min-height: 100vh; }
.card { background: var(--surface); border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.label { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: .05em; text-transform: uppercase; }
.title { font-size: 20px; font-weight: 700; margin: 4px 0; }
.plate { font-size: 16px; font-weight: 700; color: var(--accent); }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.stat-val { font-size: 22px; font-weight: 700; }
.stat-unit { font-size: 12px; font-weight: 600; margin-left: 2px; }
.alert { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.section { font-size: 13px; font-weight: 700; color: var(--accent); margin: 12px 0 8px; }
.line { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; border-bottom: 1px solid #eee; }
.total { font-size: 18px; font-weight: 700; color: var(--accent); margin-top: 12px; }
.btn { display: inline-block; padding: 10px 16px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 14px; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-danger { background: #b91c1c; color: #fff; border: none; cursor: pointer; font-size: 14px; padding: 10px 16px; border-radius: 10px; }
.timeline-item { padding: 8px 0; border-bottom: 1px solid #eee; }
.timeline-date { font-size: 12px; color: var(--muted); }
.error-card { text-align: center; padding: 32px 16px; }
.quote-doc { max-width: 800px; margin: 0 auto; padding: 24px; background: #fff; }
.quote-doc h1 { text-align: center; font-size: 24px; }
.meta { display: flex; justify-content: space-between; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { border: 1px solid #ddd; padding: 6px 8px; }
th { background: #f3f4f6; }
.num { text-align: right; }
.cat-row td { background: #f9fafb; font-weight: 700; }
@media print { .no-print { display: none; } body { background: #fff; } }
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

export function renderCustomerPortal(data: PortalData, issuer: IssuerProfile | null): string {
  const days = data.daysUntilInspection;
  const showAlert = days != null && days <= 90;
  const q = data.latestQuote;

  const quoteHtml = q
    ? `<div class="card" id="quote">
        <div class="section">お見積</div>
        <div class="total">${yen(q.grandTotal)}（税込概算）</div>
        <div class="section">${esc(QUOTE_SECTION_LABEL.basic)}</div>
        ${q.legalLines.map((l) => `<div class="line"><span>${esc(l.label)}</span><span>${yen(l.amount)}</span></div>`).join('')}
        <div class="section">${esc(QUOTE_SECTION_LABEL.inspection)} / ${esc(QUOTE_SECTION_LABEL.additional)}</div>
        ${q.serviceLines.map((l) => `<div class="line"><span>${esc(l.label)}</span><span>${yen(l.amount)}</span></div>`).join('')}
        ${q.printUrl ? `<p style="margin-top:12px"><a class="btn btn-primary" href="${esc(q.printUrl)}">印刷・PDF保存</a></p>` : ''}
        ${issuer?.phone ? `<p style="margin-top:8px"><a class="btn btn-primary" href="tel:${esc(issuer.phone)}">お問い合わせ</a></p>` : ''}
      </div>`
    : '';

  const historyHtml =
    data.histories.length > 0
      ? `<div class="card" id="history">
          <div class="section">整備履歴</div>
          ${data.histories
            .map(
              (h) =>
                `<div class="timeline-item"><div class="timeline-date">${esc(fmtDate(h.performed_at))}${h.mileage ? ` · ${h.mileage.toLocaleString('ja-JP')} km` : ''}</div><div>${esc(h.title)}</div></div>`,
            )
            .join('')}
        </div>`
      : '';

  const alertHtml = showAlert
    ? `<div class="alert"><strong>車検期限が近づいています</strong><br>${esc(fmtDate(data.inspectionExpireDate))}が期限です（${days != null && days >= 0 ? `残り${days}日` : '期限切れ'}）</div>`
    : '';

  return layout(
    `${data.customerName} 様 — マイページ`,
    `<div class="shell">
      <div class="card">
        ${issuer?.companyName ? `<div class="label">${esc(issuer.companyName)}</div>` : ''}
        <div class="label">こんにちは</div>
        <div class="title">${esc(data.customerName)} さん</div>
      </div>
      <div class="card">
        <div class="label">My Vehicle</div>
        <div class="title">${esc(data.maker)} ${esc(data.model)}</div>
        <div class="plate">${esc(data.plate)}</div>
        <div class="stats">
          <div><div class="label">走行距離</div><div class="stat-val">${data.estimatedMileage != null ? data.estimatedMileage.toLocaleString('ja-JP') : '—'}<span class="stat-unit">km</span></div></div>
          <div><div class="label">次回車検まで</div><div class="stat-val">${days != null && days >= 0 ? days : days != null ? '期限切れ' : '—'}${days != null && days >= 0 ? '<span class="stat-unit">日</span>' : ''}</div></div>
        </div>
      </div>
      ${alertHtml}
      ${quoteHtml}
      ${historyHtml}
    </div>`,
  );
}

export function renderQuoteDocument(args: {
  issuer: IssuerProfile | null;
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

  return layout(
    '見積書',
    `<div class="quote-doc">
      <p class="no-print" style="margin-bottom:16px"><button onclick="window.print()" class="btn btn-primary">印刷</button></p>
      <h1>見積書</h1>
      <div class="meta">
        <div>
          <p><strong>${esc(args.customerName)} 御中</strong></p>
          <p>件名: 車検代行作業</p>
          <p>${esc(args.maker)} ${esc(args.model)} · ${esc(args.plate)}</p>
          <p style="font-size:20px;font-weight:700;color:var(--accent)">お見積金額 ${yen(args.grandTotal)}</p>
        </div>
        <div>${issuerHtml}</div>
      </div>
      <table>
        <thead><tr><th>品名</th><th class="num">数量</th><th class="num">単価</th><th class="num">金額</th></tr></thead>
        <tbody>
          <tr class="cat-row"><td colspan="4"><strong>${esc(QUOTE_SECTION_LABEL.basic)}</strong>（非課税）</td></tr>
          ${lineRows(args.legal)}
          <tr class="cat-row"><td colspan="4"><strong>${esc(QUOTE_SECTION_LABEL.inspection)}</strong></td></tr>
          ${lineRows(inspection)}
          <tr class="cat-row"><td colspan="4"><strong>${esc(QUOTE_SECTION_LABEL.additional)}</strong></td></tr>
          ${lineRows(additional)}
        </tbody>
      </table>
      <div style="margin-top:16px;text-align:right;font-size:14px">
        <div>法定費用小計: ${yen(args.nonTaxableSubtotal)}</div>
        <div>税込サービス（本体）: ${yen(args.taxableSubtotalExTax)} / 消費税: ${yen(args.taxAmount10)}</div>
        <div class="total">合計 ${yen(args.grandTotal)}</div>
      </div>
      ${args.notes ? `<pre style="margin-top:16px;font-size:12px;white-space:pre-wrap;color:var(--muted)">${esc(args.notes)}</pre>` : ''}
      <p style="font-size:12px;color:var(--muted)">見積No. ${esc(args.quoteNo)} / 発行 ${esc(fmtDate(args.issuedAt))} / 有効期限 ${esc(fmtDate(args.validUntil))}</p>
    </div>`,
  );
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
      <form method="GET" style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">
        <input type="hidden" name="confirm" value="1">
        <button type="submit" class="btn-danger">配信を停止する</button>
      </form>
    </div></div>`,
  );
}
