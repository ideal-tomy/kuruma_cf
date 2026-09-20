export const LIST_RULES = [
  'shaken-overdue',
  'shaken-30',
  'shaken-90',
  'shaken-180',
  'oil',
] as const;

export type ListRule = (typeof LIST_RULES)[number];

export type ListRuleUrgency = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** ホーム表示順（緊急度が高い順） */
export const LIST_HOME_ORDER: ListRule[] = [
  'shaken-overdue',
  'shaken-30',
  'shaken-90',
  'shaken-180',
  'oil',
];

export const LIST_RULE_LABELS: Record<ListRule, string> = {
  'shaken-overdue': '車検満了後',
  'shaken-30': '車検1か月前',
  'shaken-90': '車検3か月前',
  'shaken-180': '車検半年前',
  oil: 'オイル交換目安',
};

export const LIST_RULE_URGENCY: Record<ListRule, ListRuleUrgency> = {
  'shaken-overdue': 'critical',
  'shaken-30': 'high',
  'shaken-90': 'medium',
  'shaken-180': 'low',
  oil: 'info',
};

const urgencyRowBorder: Record<ListRuleUrgency, string> = {
  critical: 'border-l-danger bg-danger-soft/40',
  high: 'border-l-warn bg-warn-soft/50',
  medium: 'border-l-warn/60 bg-surface',
  low: 'border-l-accent/40 bg-surface',
  info: 'border-l-accent-soft bg-surface',
};

const urgencyCountText: Record<ListRuleUrgency, string> = {
  critical: 'text-danger',
  high: 'text-warn',
  medium: 'text-ink',
  low: 'text-ink-2',
  info: 'text-accent',
};

const urgencyLabelText: Record<ListRuleUrgency, string> = {
  critical: 'text-danger font-semibold',
  high: 'text-warn font-semibold',
  medium: 'text-ink font-medium',
  low: 'text-ink',
  info: 'text-ink',
};

export function isListRule(value: string): value is ListRule {
  return (LIST_RULES as readonly string[]).includes(value);
}

export function getListRuleUrgency(rule: string): ListRuleUrgency {
  if (isListRule(rule)) return LIST_RULE_URGENCY[rule];
  return 'low';
}

export function listRuleRowBorderClass(rule: string): string {
  return urgencyRowBorder[getListRuleUrgency(rule)];
}

export function listRuleCountClass(rule: string): string {
  return urgencyCountText[getListRuleUrgency(rule)];
}

export function listRuleLabelClass(rule: string): string {
  return urgencyLabelText[getListRuleUrgency(rule)];
}

export function sortHomeLists<T extends { rule: string }>(lists: T[]): T[] {
  const order = new Map(LIST_HOME_ORDER.map((r, i) => [r, i]));
  return [...lists].sort(
    (a, b) => (order.get(a.rule as ListRule) ?? 99) - (order.get(b.rule as ListRule) ?? 99),
  );
}
