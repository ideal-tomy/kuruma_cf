function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildToken(secret: string, payload: string, ttlSec: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = `${payload}.${exp}`;
  const sig = await hmacHex(secret, body);
  return toBase64Url(new TextEncoder().encode(`${body}.${sig}`));
}

async function verifyToken(
  secret: string,
  token: string,
  parts: number,
): Promise<{ payload: string[]; expiresAt: number } | null> {
  try {
    const decoded = fromBase64Url(token);
    const segs = decoded.split('.');
    if (segs.length !== parts + 2) return null;
    const exp = Number(segs[parts]);
    const sig = segs[parts + 1];
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const body = `${segs.slice(0, parts + 1).join('.')}`;
    const expectedPayload = segs.slice(0, parts).join('.') + `.${exp}`;
    const expected = await hmacHex(secret, expectedPayload);
    if (expected !== sig) return null;
    return { payload: segs.slice(0, parts), expiresAt: exp };
  } catch {
    return null;
  }
}

export async function buildQuoteShareToken(secret: string, quoteId: string): Promise<string> {
  return buildToken(secret, quoteId, 60 * 60 * 24 * 90);
}

export async function verifyQuoteShareToken(
  secret: string,
  token: string,
): Promise<{ quoteId: string; expiresAt: number } | null> {
  const v = await verifyToken(secret, token, 1);
  if (!v) return null;
  return { quoteId: v.payload[0]!, expiresAt: v.expiresAt };
}

export async function buildCustomerPortalToken(
  secret: string,
  customerId: string,
): Promise<string> {
  return buildToken(secret, customerId, 60 * 60 * 24 * 365);
}

export async function verifyCustomerPortalToken(
  secret: string,
  token: string,
): Promise<{ customerId: string; expiresAt: number } | null> {
  const v = await verifyToken(secret, token, 1);
  if (!v) return null;
  return { customerId: v.payload[0]!, expiresAt: v.expiresAt };
}

export async function buildOptOutToken(
  secret: string,
  customerId: string,
  channel: string,
): Promise<string> {
  return buildToken(secret, `${customerId}.${channel}`, 60 * 60 * 24 * 365);
}

export async function verifyOptOutToken(
  secret: string,
  token: string,
): Promise<{ customerId: string; channel: string; expiresAt: number } | null> {
  const v = await verifyToken(secret, token, 2);
  if (!v) return null;
  return { customerId: v.payload[0]!, channel: v.payload[1]!, expiresAt: v.expiresAt };
}
