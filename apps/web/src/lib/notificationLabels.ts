const RULE_KEY_LABELS: Record<string, string> = {
  shaken_overdue: '車検満了後',
  shaken_30days: '車検1か月前',
  shaken_90days: '車検3か月前',
  shaken_180days: '車検半年前',
  oil_4000km: 'オイル交換目安',
};

const STATUS_LABELS: Record<string, string> = {
  SENT: '送信済',
  FAILED: '失敗',
  PENDING: '待機中',
  CANCELLED: '取消',
};

export function ruleKeyLabel(ruleKey: string): string {
  return RULE_KEY_LABELS[ruleKey] ?? ruleKey;
}

export function jobStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function jobStatusTone(status: string): 'success' | 'danger' | 'muted' | 'warn' {
  switch (status) {
    case 'SENT':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'PENDING':
      return 'warn';
    default:
      return 'muted';
  }
}
