import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { previewNotification, sendNotification, type NotificationPreviewSummary } from '../../lib/api';
import { isListRule, LIST_RULE_LABELS } from '../../lib/listRules';
import type { SendFlowTarget } from '../../lib/sendFlow';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';

type Props = {
  target: SendFlowTarget;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export function SendSheet({ target, open, onClose, onSent }: Props) {
  const navigate = useNavigate();
  const { rule, customerId, vehicleId, customerName, plate } = target;

  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<NotificationPreviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ruleLabel = isListRule(rule) ? LIST_RULE_LABELS[rule] : rule;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccess(null);
    previewNotification({ customerId, vehicleId, rule })
      .then((data) => {
        if (!cancelled) {
          setContent(data.content);
          setSummary(data.summary);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'プレビューに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerId, vehicleId, rule]);

  if (!open) return null;

  const goEditQuote = () => {
    onClose();
    navigate(`/quotes/${vehicleId}`, { state: { fromSend: target } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">送信確認</p>
              <p className="mt-1 truncate text-sm font-semibold text-ink">{customerName}</p>
              <p className="mt-0.5 text-sm font-bold text-accent">{plate}</p>
              <p className="mt-1 text-xs text-ink-3">{ruleLabel}</p>
            </div>
            <Button variant="ghost" className="min-h-11 shrink-0 px-2 py-1 text-xs" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {success && <Toast message={success} />}
          {loading && <p className="text-sm text-ink-3">文面を読み込み中…</p>}
          {error && <Toast message={error} tone="error" />}

          {!loading && !error && summary && (
            <div className="space-y-4">
              <section className="rounded-xl border border-border bg-surface-2/80 p-3">
                <p className="text-xs font-bold text-ink-2">お見積概要</p>
                {summary.hasQuote ? (
                  <>
                    <p className="mt-2 text-xl font-bold tabular-nums text-accent">
                      合計 {summary.grandTotal}
                    </p>
                    <p className="mt-1 text-xs text-ink-3">
                      法定 {summary.legalFeesTotal}円 · 最低 {summary.minimumTotal}円
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-warn">見積未発行 — 送信前に作成することをおすすめします</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-11 flex-1 text-sm" onClick={goEditQuote}>
                    見積を編集
                  </Button>
                  {summary.portalUrl && (
                    <a
                      href={summary.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-accent"
                    >
                      お客様画面
                    </a>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-bold text-ink-2">LINE 文面</p>
                <p className="mt-1 text-xs text-ink-3">必要なら編集してから送信してください</p>
                <textarea
                  className="mt-2 min-h-40 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm leading-relaxed"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </section>
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              className="min-h-11 w-full"
              disabled={sending || !content.trim()}
              onClick={async () => {
                setSending(true);
                setError(null);
                try {
                  const result = await sendNotification({
                    rule,
                    customerIds: [{ customerId, vehicleId }],
                    contentOverride: content,
                  });
                  if (result.failed > 0) {
                    setError('送信に失敗しました。履歴を確認してください');
                    return;
                  }
                  setSuccess('送信しました');
                  onSent();
                  setTimeout(() => {
                    onClose();
                  }, 600);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : '送信に失敗しました');
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? '送信中…' : 'LINE で送信'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
