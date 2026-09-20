#!/usr/bin/env node
/**
 * 本番用 secrets JSON を生成（.production-secrets.json）。
 * LINE は準備でき次第、同ファイルに追記して register-line-secrets スクリプトを実行。
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, '.production-secrets.json');

function secret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

const demoPassword = secret(18);

const secrets = {
  SESSION_SECRET: secret(32),
  DEMO_PASSWORD: demoPassword,
  CUSTOMER_PORTAL_SECRET: secret(32),
  QUOTE_SHARE_SECRET: secret(32),
  OPT_OUT_SECRET: secret(32),
  // LINE 準備後に値を入れて `npm run secrets:line` を実行
  // LINE_CHANNEL_ACCESS_TOKEN: '',
  // LINE_CHANNEL_SECRET: '',
};

writeFileSync(outPath, `${JSON.stringify(secrets, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outPath}`);
console.log('');
console.log('Demo login (production):');
console.log(`  email: demo@example.com`);
console.log(`  password: ${demoPassword}`);
console.log('');
console.log('Next: npm run deploy:production');
