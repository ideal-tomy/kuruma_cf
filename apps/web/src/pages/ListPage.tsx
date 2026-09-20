import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchList } from '../lib/api';
import { formatDate, formatDays, formatKm } from '../lib/format';
import { isListRule, LIST_RULE_LABELS } from '../lib/listRules';
import type { ListTarget } from '../lib/types';
import { SendSheet } from '../components/notifications/SendSheet';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SubPageHeader } from '../components/ui/SubPageHeader';

export function ListPage() {
  const { rule } = useParams<{ rule: string }>();
  const [targets, setTargets] = useState<ListTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<ListTarget | null>(null);

  const validRule = rule && isListRule(rule);

  useEffect(() => {
    if (!validRule) return;
    let cancelled = false;
    setLoading(true);
    fetchList(rule)
      .then((data) => {
        if (!cancelled) setTargets(data.targets);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rule, validRule]);

  if (!validRule) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">不明なリストです</p>
        <Link to="/" className="text-sm font-semibold text-accent">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const label = LIST_RULE_LABELS[rule];

  return (
    <div className="space-y-4">
      <SubPageHeader
        backTo="/"
        backLabel="ホーム"
        title={label}
        subtitle={`対象 ${targets.length} 件`}
      />

      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && !error && targets.length === 0 && (
        <EmptyState title="該当する顧客がいません" description="条件に合う車両は現在ありません" />
      )}

      <ul className="space-y-2">
        {targets.map((t) => (
          <li key={t.vehicleId} className="rounded-2xl bg-surface px-4 py-3 shadow-sm">
            <Link
              to={`/customers/${t.customerId}`}
              className="block transition hover:opacity-90"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="mt-1 text-sm font-medium text-accent">{t.plate}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    {t.maker} {t.model}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  {rule === 'oil' ? (
                    <>
                      <p className="font-semibold tabular-nums text-ink">
                        {formatKm(t.estimatedMileage)}
                      </p>
                      {t.oilOverageKm != null && (
                        <p className="mt-1 text-ink-3">
                          目安超過 {formatKm(Math.max(0, t.oilOverageKm))}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-ink">
                        {formatDays(t.daysUntilInspection)}
                      </p>
                      <p className="mt-1 text-ink-3">{formatDate(t.inspectionExpireDate)}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span
                  className={[
                    'rounded-full px-2 py-0.5 font-semibold',
                    t.hasLine ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-3',
                  ].join(' ')}
                >
                  {t.hasLine ? 'LINE 可' : 'LINE 未'}
                </span>
                {!t.hasConsent && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 font-semibold text-danger">
                    配信停止
                  </span>
                )}
              </div>
            </Link>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Button
                className="flex-1 text-xs"
                disabled={!t.hasLine || !t.hasConsent}
                onClick={() => setSendTarget(t)}
              >
                LINE 送信
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {sendTarget && validRule && (
        <SendSheet
          rule={rule}
          customerId={sendTarget.customerId}
          vehicleId={sendTarget.vehicleId}
          customerName={sendTarget.name}
          plate={sendTarget.plate}
          open
          onClose={() => setSendTarget(null)}
          onSent={() => setSendTarget(null)}
        />
      )}
    </div>
  );
}
