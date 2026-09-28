export function sameOriginHref(absoluteUrl: string): string {
  const parsed = new URL(absoluteUrl, window.location.origin);
  return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function staffPreviewHref(absoluteUrl: string): string {
  const parsed = new URL(absoluteUrl, window.location.origin);
  const next = new URL(`${parsed.pathname}${parsed.search}`, window.location.origin);
  next.searchParams.set('preview', '1');
  next.hash = parsed.hash;
  return next.toString();
}
