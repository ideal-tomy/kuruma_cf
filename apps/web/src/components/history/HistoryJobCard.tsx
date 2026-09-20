import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/format';
import { jobStatusLabel, jobStatusTone, ruleKeyLabel } from '../../lib/notificationLabels';
import type { NotificationJob } from '../../lib/types';
import { Button } from '../ui/Button';

type Props = {
  job: NotificationJob;
  retrying: boolean;
  onRetry: () => void;
};

const statusBadgeClass: Record<ReturnType<typeof jobStatusTone>, string> = {
  success: 'bg-accent-soft text-accent',
  danger: 'bg-danger/10 text-danger',
  warn: 'bg-warn-soft text-warn',
  muted: 'bg-surface-2 text-ink-3',
};

export function HistoryJobCard({ job, retrying, onRetry }: Props) {
  const isFailed = job.status === 'FAILED';
  const tone = jobStatusTone(job.status);

  return (
    <li
      className={[
        'overflow-hidden rounded-2xl border shadow-sm',
        isFailed ? 'border-danger/30 border-l-4 border-l-danger bg-danger-soft/30' : 'border-border bg-surface',
      ].join(' ')}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/customers/${job.customerId}`} className="font-semibold text-ink hover:text-accent">
              {job.customerName}
            </Link>
            {job.vehiclePlate && (
              <p className="mt-1 text-sm font-bold text-ink-2">{job.vehiclePlate}</p>
            )}
            <p className="mt-1 text-xs text-ink-3">
              {ruleKeyLabel(job.ruleKey)}
              {job.customerPhone ? ` · ${job.customerPhone}` : ''}
            </p>
            <p className="mt-1 text-xs text-ink-3">{formatDate(job.createdAt)}</p>
            {job.lastError && (
              <p className="mt-2 rounded-lg bg-danger/5 px-2 py-1.5 text-xs leading-relaxed text-danger">
                {job.lastError}
              </p>
            )}
          </div>
          <span
            className={[
              'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
              statusBadgeClass[tone],
            ].join(' ')}
          >
            {jobStatusLabel(job.status)}
          </span>
        </div>
      </div>

      {isFailed && (
        <div className="border-t border-danger/20 bg-surface/80 px-4 py-3">
          <Button
            className="min-h-11 w-full"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? '再送中…' : 'LINE で再送'}
          </Button>
        </div>
      )}
    </li>
  );
}
