async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isNotificationIdempotencyDisabled(env: { NOTIFICATION_IDEMPOTENCY_DISABLED?: string }): boolean {
  return env.NOTIFICATION_IDEMPOTENCY_DISABLED === 'true';
}

export async function buildIdempotencyKey(args: {
  customerId: string;
  ruleKey: string;
  channel: string;
  date?: Date;
  nonce?: string;
}): Promise<string> {
  const d = (args.date ?? new Date()).toISOString().slice(0, 10);
  const raw = `${d}:${args.customerId}:${args.ruleKey}:${args.channel}${args.nonce ? `:${args.nonce}` : ''}`;
  const hash = (await sha1Hex(raw)).slice(0, 16);
  const suffix = args.nonce ? `${hash}-${args.nonce}` : hash;
  return `${d}-${args.ruleKey}-${args.channel}-${suffix}`;
}
