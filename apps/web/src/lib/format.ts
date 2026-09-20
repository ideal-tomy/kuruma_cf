export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${y}/${m}/${day}`;
}

export function formatDays(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days < 0) return `期限切れ ${Math.abs(days)}日`;
  if (days === 0) return '本日';
  return `残 ${days}日`;
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '—';
  return `${km.toLocaleString('ja-JP')} km`;
}

export function formatYen(amount: number): string {
  return `${amount.toLocaleString('ja-JP')}円`;
}

export function formatPrice(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/** 見積タブ用。内部の見積番号（QT-… / DEMO-…）はユーザーに見せない */
export function formatQuoteTabLabel(
  quote: { grandTotal: number; totalAmount: number; issuedAt: string | null; createdAt: string },
  index: number,
): string {
  const price = formatPrice(quote.grandTotal || quote.totalAmount);
  if (index === 0) return `最新 ${price}`;
  return `${formatDate(quote.issuedAt ?? quote.createdAt)} ${price}`;
}
