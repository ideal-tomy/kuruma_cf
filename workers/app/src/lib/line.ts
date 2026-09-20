export type LineSendResult = {
  success: boolean;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export async function sendLineMessage(
  accessToken: string | undefined,
  toUserId: string,
  text: string,
  isProduction = false,
): Promise<LineSendResult> {
  if (!accessToken) {
    if (isProduction) {
      return {
        success: false,
        errorCode: 'MISSING_LINE_ACCESS_TOKEN',
        errorMessage: 'LINE_CHANNEL_ACCESS_TOKEN が未設定のため本番送信できません',
      };
    }
    return { success: true, providerMessageId: `mock-line-${Date.now()}` };
  }
  if (!toUserId) {
    return {
      success: false,
      errorCode: 'NO_LINE_USER_ID',
      errorMessage: '友だち追加が完了しておらず LINE userId が未取得です',
    };
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: toUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      let detail = body.slice(0, 500);
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) detail = parsed.message;
      } catch {
        // ignore
      }
      return { success: false, errorCode: `HTTP_${res.status}`, errorMessage: detail };
    }
    return { success: true, providerMessageId: res.headers.get('x-line-request-id') ?? undefined };
  } catch (e) {
    return {
      success: false,
      errorCode: 'NETWORK',
      errorMessage: e instanceof Error ? e.message : 'network error',
    };
  }
}

export async function verifyLineSignature(
  secret: string | undefined,
  rawBody: string,
  signature: string | null,
  allowUnsigned = true,
): Promise<boolean> {
  if (!secret || !signature) return allowUnsigned;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  if (expected.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) {
    ok |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return ok === 0;
}
