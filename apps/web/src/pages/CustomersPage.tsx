import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers } from '../lib/api';
import type { Customer } from '../lib/types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LineBadge } from '../components/ui/LineBadge';

export function CustomersPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCustomers(query)
      .then((rows) => {
        if (!cancelled) setCustomers(rows);
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
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">顧客一覧</h2>
        <Link to="/customers/new">
          <Button className="min-h-11">新規</Button>
        </Link>
      </div>

      <input
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent"
        placeholder="名前・ふりがな・電話・ナンバーで検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && !error && customers.length === 0 && (
        <EmptyState
          title="該当する顧客がいません"
          description={query ? '検索条件を変えてみてください' : '右上の「新規」から登録できます'}
        />
      )}

      <ul className="space-y-2">
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link
              to={`/customers/${customer.id}`}
              className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm transition hover:bg-surface-2 active:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-ink">{customer.name}</p>
                  <LineBadge linked={Boolean(customer.lineUserId)} />
                </div>
                {customer.primaryPlate && (
                  <p className="mt-1 text-sm font-medium text-ink-2">{customer.primaryPlate}</p>
                )}
                <p className="mt-0.5 text-xs text-ink-3">
                  {[
                    customer.primaryVehicleLabel,
                    customer.furigana,
                    customer.phone,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-accent">詳細 ›</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
