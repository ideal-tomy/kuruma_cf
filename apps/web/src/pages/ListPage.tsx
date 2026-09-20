import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { fetchList } from '../lib/api';
import { isListRule, LIST_RULE_LABELS } from '../lib/listRules';
import type { SendFlowLocationState, SendFlowTarget } from '../lib/sendFlow';
import type { ListTarget } from '../lib/types';
import { ListTargetCard } from '../components/lists/ListTargetCard';
import { SendSheet } from '../components/notifications/SendSheet';
import { EmptyState } from '../components/ui/EmptyState';
import { SubPageHeader } from '../components/ui/SubPageHeader';

export function ListPage() {
  const { rule } = useParams<{ rule: string }>();
  const location = useLocation();
  const [targets, setTargets] = useState<ListTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<SendFlowTarget | null>(null);

  const validRule = rule && isListRule(rule);

  useEffect(() => {
    const state = location.state as SendFlowLocationState | null;
    if (state?.reopenSend && validRule) {
      setSendTarget(state.reopenSend);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, validRule]);

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

  const openSend = (t: ListTarget) => {
    setSendTarget({
      rule,
      customerId: t.customerId,
      vehicleId: t.vehicleId,
      customerName: t.name,
      plate: t.plate,
    });
  };

  return (
    <div className="space-y-4">
      <SubPageHeader
        backTo="/"
        backLabel="ホーム"
        title={label}
        subtitle={`対象 ${targets.length} 件 — 名前・ナンバー・残日を確認して送信`}
      />

      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && !error && targets.length === 0 && (
        <EmptyState title="該当する顧客がいません" description="条件に合う車両は現在ありません" />
      )}

      <ul className="space-y-3">
        {targets.map((t) => (
          <ListTargetCard key={t.vehicleId} target={t} rule={rule} onSend={() => openSend(t)} />
        ))}
      </ul>

      {sendTarget && (
        <SendSheet
          target={sendTarget}
          open
          onClose={() => setSendTarget(null)}
          onSent={() => setSendTarget(null)}
        />
      )}
    </div>
  );
}
