export const LIST_RULES = [
  'shaken-overdue',
  'shaken-30',
  'shaken-90',
  'shaken-180',
  'oil',
] as const;

export type ListRule = (typeof LIST_RULES)[number];

export const LIST_RULE_LABELS: Record<ListRule, string> = {
  'shaken-overdue': '車検満了後',
  'shaken-30': '車検1か月前',
  'shaken-90': '車検3か月前',
  'shaken-180': '車検半年前',
  oil: 'オイル交換目安',
};

export function isListRule(value: string): value is ListRule {
  return (LIST_RULES as readonly string[]).includes(value);
}
