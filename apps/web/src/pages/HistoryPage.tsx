import { useEffect, useState } from 'react';
import { fetchNotificationLogs, retryNotifications } from '../lib/api';
import type { NotificationJob } from '../lib/types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SubPageHeader } from '../components/ui/SubPageHeader';
import { formatDate } from '../lib/format';

export function HistoryPage() {
  const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'FAILED'>('all');

  const reload = () =>
    fetchNotificationLogs(filter === 'FAILED' ? { status: 'FAILED' } : {})
      .then(setJobs)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '読み込みに失敗しました'));

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <SubPageHeader backTo="/" backLabel="ホーム" title="送信履歴" />

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          className="text-xs"
          onClick={() => setFilter('all')}
        >
          すべて
        </Button>
        <Button
          variant={filter === 'FAILED' ? 'primary' : 'secondary'}
          className="text-xs"
          onClick={() => setFilter('FAILED')}
        >
          失敗のみ
        </Button>
      </div>

      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && jobs.length === 0 && (
        <EmptyState title="送信履歴がありません" />
      )}

      <ul className="space-y-2">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-2xl bg-surface px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{job.customerName}</p>
                <p className="mt-1 text-xs text-ink-3">
                  {job.ruleKey} · {job.channel} · {formatDate(job.createdAt)}
                </p>
                {job.lastError && (
                  <p className="mt-2 text-xs text-danger">{job.lastError}</p>
                )}
              </div>
              <span
                className={[
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                  job.status === 'SENT' ? 'bg-accent-soft text-accent' : 'bg-danger/10 text-danger',
                ].join(' ')}
              >
                {job.status}
              </span>
            </div>
            {job.status === 'FAILED' && (
              <Button
                variant="secondary"
                className="mt-3 text-xs"
                onClick={async () => {
                  await retryNotifications([job.id]);
                  await reload();
                }}
              >
                再送
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
