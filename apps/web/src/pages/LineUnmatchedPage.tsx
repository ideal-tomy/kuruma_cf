import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLineUnmatched, linkLineUser, listCustomers } from '../lib/api';
import type { Customer, LineUnmatchedItem } from '../lib/types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, inputClass } from '../components/ui/Field';
import { SubPageHeader } from '../components/ui/SubPageHeader';

export function LineUnmatchedPage() {
  const [items, setItems] = useState<LineUnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<Customer[]>([]);

  const reload = () =>
    fetchLineUnmatched()
      .then(setItems)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '読み込みに失敗しました'));

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!matchId || !query.trim()) {
      setCandidates([]);
      return;
    }
    let cancelled = false;
    listCustomers(query)
      .then((rows) => {
        if (!cancelled) setCandidates(rows);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, query]);

  return (
    <div className="space-y-4">
      <SubPageHeader
        backTo="/"
        backLabel="ホーム"
        title="LINE 未紐付"
        subtitle="友だち追加済みだが顧客に結びついていない LINE"
      />

      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && items.length === 0 && (
        <EmptyState title="未紐付の LINE はありません" />
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.lineUserId} className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="break-all font-mono text-xs text-ink-2">{item.lineUserId}</p>
            {item.lastText && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{item.lastText}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/customers/new?lineUserId=${encodeURIComponent(item.lineUserId)}`}>
                <Button variant="secondary" className="text-xs">
                  新規顧客として登録
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => {
                  setMatchId(item.lineUserId);
                  setQuery('');
                }}
              >
                既存顧客に紐付
              </Button>
            </div>

            {matchId === item.lineUserId && (
              <div className="mt-4 border-t border-border pt-4">
                <Field label="顧客を検索">
                  <input
                    className={inputClass}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="名前・電話"
                  />
                </Field>
                <ul className="mt-2 space-y-2">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-surface-2 px-3 py-2 text-left text-sm"
                        onClick={async () => {
                          await linkLineUser(item.lineUserId, c.id);
                          setMatchId(null);
                          await reload();
                        }}
                      >
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
