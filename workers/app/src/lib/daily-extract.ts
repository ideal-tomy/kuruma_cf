import type { AppEnv } from '../env';
import { filterByRule, loadOverviewFromDb, type ListRule } from './extraction';
import { buildIdempotencyKey } from './idempotency';
import { newId } from './ids';
import { RULE_KEY_TO_LIST } from './rule-map';
import { nowIso } from './time';
import type { NotificationRuleRow } from '../types';

export type DailyExtractSummary = Record<
  string,
  { found: number; queued: number; channels: string[] }
>;

export type DailyExtractResult = {
  ok: true;
  enabled: boolean;
  trigger: string;
  summary: DailyExtractSummary;
  auditLogId: string;
};

function isAutoSendEnabled(env: AppEnv['Bindings']): boolean {
  return (env.AUTO_SEND_ENABLED ?? 'false').toLowerCase() === 'true';
}

function parseChannels(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((c): c is string => typeof c === 'string' && c.length > 0);
    }
  } catch {
    // ignore
  }
  return ['LINE'];
}

async function loadActiveRules(db: D1Database): Promise<NotificationRuleRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM notification_rules WHERE active = 1 ORDER BY rule_key ASC')
    .all<NotificationRuleRow>();
  return results ?? [];
}

export async function runDailyExtract(
  env: AppEnv['Bindings'],
  meta: { trigger: string; cron?: string },
): Promise<DailyExtractResult> {
  const enabled = isAutoSendEnabled(env);
  const overview = await loadOverviewFromDb(env.DB);
  const rules = await loadActiveRules(env.DB);
  const summary: DailyExtractSummary = {};
  const ts = nowIso();

  for (const rule of rules) {
    const listRule = RULE_KEY_TO_LIST[rule.rule_key];
    const channels = parseChannels(rule.channels);
    if (!listRule) {
      summary[rule.rule_key] = { found: 0, queued: 0, channels };
      continue;
    }

    const targets = filterByRule(overview, listRule);
    summary[rule.rule_key] = { found: targets.length, queued: 0, channels };

    if (!enabled) continue;

    for (const target of targets) {
      for (const channel of channels) {
        if (channel !== 'LINE') continue;
        const idempotencyKey = await buildIdempotencyKey({
          customerId: target.customerId,
          ruleKey: rule.rule_key,
          channel,
        });
        try {
          await env.DB.prepare(
            `INSERT INTO notification_jobs (
              id, customer_id, vehicle_id, rule_key, channel, template_key,
              scheduled_at, status, attempts, idempotency_key, payload,
              requested_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, NULL, ?, ?)`,
          )
            .bind(
              newId(),
              target.customerId,
              target.vehicleId,
              rule.rule_key,
              channel,
              rule.template_key,
              ts,
              idempotencyKey,
              JSON.stringify({ auto: true, ruleKey: rule.rule_key, trigger: meta.trigger }),
              ts,
              ts,
            )
            .run();
          summary[rule.rule_key].queued += 1;
        } catch {
          // 冪等キー衝突などはスキップ
        }
      }
    }
  }

  const auditLogId = newId();
  const payload = JSON.stringify({
    enabled,
    trigger: meta.trigger,
    cron: meta.cron ?? null,
    summary,
  });

  await env.DB.prepare(
    'INSERT INTO audit_logs (id, action, resource, payload, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(auditLogId, 'cron.daily_extract', 'notification_jobs', payload, ts)
    .run();

  return { ok: true, enabled, trigger: meta.trigger, summary, auditLogId };
}
