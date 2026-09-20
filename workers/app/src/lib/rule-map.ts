import type { ListRule } from './extraction';

/** リスト slug → 通知 rule_key / template_key */
export const LIST_TO_RULE_KEY: Record<ListRule, string> = {
  'shaken-overdue': 'shaken_overdue',
  'shaken-30': 'shaken_30days',
  'shaken-90': 'shaken_90days',
  'shaken-180': 'shaken_180days',
  oil: 'oil_4000km',
};

export const RULE_KEY_TO_LIST: Record<string, ListRule> = {
  shaken_overdue: 'shaken-overdue',
  shaken_30days: 'shaken-30',
  shaken_90days: 'shaken-90',
  shaken_180days: 'shaken-180',
  oil_4000km: 'oil',
};

export function resolveTemplateKey(rule: string, explicit?: string | null): string {
  if (explicit?.trim()) return explicit.trim();
  if (rule in LIST_TO_RULE_KEY) return LIST_TO_RULE_KEY[rule as ListRule];
  return rule;
}
