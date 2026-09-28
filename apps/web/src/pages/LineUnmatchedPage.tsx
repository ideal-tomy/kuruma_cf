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
            <p className="text-base font-bold text-ink">{item.displayName || '名前未取得'}</p>
            {item.lastText ? (
              <div className="mt-2 rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-xs text-ink-3">最後のメッセージ</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{item.lastText}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-3">メッセージはまだありません</p>
            )}
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to={`/customers/new?lineUserId=${encodeURIComponent(item.lineUserId)}`}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-white active:opacity-80"
              >
                新しいお客様として登録
              </Link>
              <Button
                variant="secondary"
                className="min-h-12 w-full text-base"
                onClick={() => {
                  setMatchId(item.lineUserId);
                  setQuery('');
                }}
              >
                登録済みのお客様と結びつける
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
