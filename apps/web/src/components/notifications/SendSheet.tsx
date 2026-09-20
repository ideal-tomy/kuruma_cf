import { useEffect, useState } from 'react';
import { previewNotification, sendNotification } from '../../lib/api';
import { Button } from '../ui/Button';

type Props = {
  rule: string;
  customerId: string;
  vehicleId: string;
  customerName: string;
  plate: string;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
};

export function SendSheet({
  rule,
  customerId,
  vehicleId,
  customerName,
  plate,
  open,
  onClose,
  onSent,
}: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    previewNotification({ customerId, vehicleId, rule })
      .then((data) => {
        if (!cancelled) setContent(data.content);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">送信確認</p>
            <p className="mt-1 text-xs text-ink-3">
              {customerName} · {plate}
            </p>
          </div>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onClose}>
            閉じる
          </Button>
        </div>

        {loading && <p className="mt-4 text-sm text-ink-3">文面を読み込み中…</p>}
        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        {!loading && !error && (
          <>
            <textarea
              className="mt-4 min-h-48 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                disabled={sending || !content.trim()}
                onClick={async () => {
                  setSending(true);
                  try {
                    await sendNotification({
                      rule,
                      customerIds: [{ customerId, vehicleId }],
                      contentOverride: content,
                    });
                    onSent();
                    onClose();
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
          </>
        )}
      </div>
    </div>
  );
}
