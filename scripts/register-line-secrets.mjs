#!/usr/bin/env node
/**
 * LINE トークン受領後、.production-secrets.json に追記したキーを Worker に反映。
 *
 * .production-secrets.json 例:
 * {
 *   ...
 *   "LINE_CHANNEL_ACCESS_TOKEN": "xxx",
 *   "LINE_CHANNEL_SECRET": "yyy"
 * }
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const secretsPath = join(root, '.production-secrets.json');

if (!existsSync(secretsPath)) {
  console.error('Missing .production-secrets.json — run: node scripts/generate-production-secrets.mjs');
  process.exit(1);
}

const secrets = JSON.parse(readFileSync(secretsPath, 'utf8'));
const lineKeys = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
const missing = lineKeys.filter((k) => !secrets[k]?.trim());

if (missing.length) {
  console.error(`Missing in .production-secrets.json: ${missing.join(', ')}`);
  console.error('Add LINE values, then re-run: npm run secrets:line');
  process.exit(1);
}

const payload = Object.fromEntries(lineKeys.map((k) => [k, secrets[k].trim()]));
const tmpPath = join(root, '.line-secrets.tmp.json');
writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const result = spawnSync('npx', ['wrangler', 'secret', 'bulk', tmpPath], {
  cwd: root,
  encoding: 'utf8',
  shell: true,
});

try {
  unlinkSync(tmpPath);
} catch {
  // ignore
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log('LINE secrets registered on kuruma-cf Worker.');
console.log('Webhook URL: https://kuruma-cf.ryojitomii.workers.dev/webhook/line');
