export function normalizeMessageNewlines(text: string): string {
  return text.replace(/\\n/g, '\n');
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  const raw = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === null || value === undefined) return '';
    return String(value);
  });
  return normalizeMessageNewlines(raw);
}

export function renderNotificationTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  const missing = Array.from(template.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g))
    .map((match) => match[1])
    .filter((key) => vars[key] == null || vars[key] === '');
  if (missing.length) {
    throw new Error(`文面の差し込み情報が不足しています: ${[...new Set(missing)].join('、')}`);
  }
  const compatible = template.replace(
    /[¥￥]\s*\{\{\s*grandTotal\s*\}\}/g,
    vars.grandTotal != null && /^[¥￥]/.test(String(vars.grandTotal))
      ? '{{grandTotal}}'
      : '¥{{grandTotal}}',
  );
  const content = renderTemplate(compatible, vars);
  if (/\{\{[\s\S]*?\}\}/.test(content)) {
    throw new Error('文面に未解決の差し込み項目があります');
  }
  return content;
}
