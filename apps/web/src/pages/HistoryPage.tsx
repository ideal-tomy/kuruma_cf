import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchNotificationLogs, retryNotifications } from '../lib/api';
import type { NotificationJob } from '../lib/types';
import { HistoryJobCard } from '../components/history/HistoryJobCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SubPageHeader } from '../components/ui/SubPageHeader';

type Filter = 'action' | 'all';

export function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter: Filter = searchParams.get('view') === 'all' ? 'all' : 'action';

  const [jobs, setJobs] = useState<NotificationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryAll, setRetryAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = await fetchNotificationLogs(filter === 'action' ? { status: 'FAILED' } : {});
    setJobs(rows);
    return rows;
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reload()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const failedJobs = useMemo(() => jobs.filter((j) => j.status === 'FAILED'), [jobs]);
  const sentJobs = useMemo(() => jobs.filter((j) => j.status !== 'FAILED'), [jobs]);

  const setFilterAndUrl = (next: Filter) => {
    setFilter(next);
    if (next === 'action') {
      setSearchParams({});
    } else {
      setSearchParams({ view: 'all' });
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    setMessage(null);
    try {
      await retryNotifications([jobId]);
      setMessage('再送しました');
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '再送に失敗しました');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (failedJobs.length === 0) return;
    setRetryAll(true);
    setMessage(null);
    try {
      await retryNotifications(failedJobs.map((j) => j.id));
      setMessage(`${failedJobs.length}件を再送しました`);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '一括再送に失敗しました');
    } finally {
      setRetryAll(false);
    }
  };

  const showFailedSection = filter === 'action' ? jobs : failedJobs;
  const showSentSection = filter === 'all' ? sentJobs : [];

  return (
    <div className="space-y-4">
      <SubPageHeader
        backTo="/"
        backLabel="ホーム"
        title="送信履歴"
        subtitle="失敗した送信を確認して再送できます"
      />

      <div className="flex gap-2">
        <Button
          variant={filter === 'action' ? 'primary' : 'secondary'}
          className="min-h-11 flex-1 text-sm"
          onClick={() => setFilterAndUrl('action')}
        >
          要再送
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          className="min-h-11 flex-1 text-sm"
          onClick={() => setFilterAndUrl('all')}
        >
          すべて
        </Button>
      </div>

      {message && (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent">{message}</p>
      )}
      {loading && <p className="text-sm text-ink-3">読み込み中…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && filter === 'action' && jobs.length === 0 && (
        <EmptyState
          title="送信失敗はありません"
          description="問題がなければホームに戻って案内作業を続けられます"
        />
      )}

      {!loading && filter === 'all' && jobs.length === 0 && (
        <EmptyState title="送信履歴がありません" />
      )}

      {!loading && showFailedSection.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-danger">
              要再送 {showFailedSection.length}件
            </p>
            {showFailedSection.length > 1 && filter === 'action' && (
              <Button
                variant="secondary"
                className="min-h-11 text-xs"
                disabled={retryAll}
                onClick={() => void handleRetryAll()}
              >
                {retryAll ? '再送中…' : 'すべて再送'}
              </Button>
            )}
          </div>
          <ul className="space-y-3">
            {showFailedSection.map((job) => (
              <HistoryJobCard
                key={job.id}
                job={job}
                retrying={retryingId === job.id || retryAll}
                onRetry={() => void handleRetry(job.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && showSentSection.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-bold text-ink-2">送信済み</p>
          <ul className="space-y-2">
            {showSentSection.map((job) => (
              <HistoryJobCard
                key={job.id}
                job={job}
                retrying={false}
                onRetry={() => {}}
              />
            ))}
          </ul>
        </section>
      )}

      {!loading && filter === 'all' && failedJobs.length === 0 && sentJobs.length > 0 && (
        <p className="text-center text-xs text-ink-3">
          <Link to="/" className="text-accent">
            ホームへ戻る
          </Link>
        </p>
      )}
    </div>
  );
}
