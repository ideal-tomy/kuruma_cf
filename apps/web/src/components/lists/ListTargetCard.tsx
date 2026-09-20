import { Link } from 'react-router-dom';
import { formatDate, formatDays, formatKm } from '../../lib/format';
import { isListRule, listRuleRowBorderClass } from '../../lib/listRules';
import type { ListTarget } from '../../lib/types';
import { Button } from '../ui/Button';
import { LineBadge } from '../ui/LineBadge';

type Props = {
  target: ListTarget;
  rule: string;
  onSend: () => void;
};

export function ListTargetCard({ target, rule, onSend }: Props) {
  const isOil = rule === 'oil';
  const urgencyBorder = isListRule(rule) ? listRuleRowBorderClass(rule) : 'border-l-border bg-surface';
  const daysOverdue = !isOil && target.daysUntilInspection != null && target.daysUntilInspection < 0;

  return (
    <li
      className={[
        'overflow-hidden rounded-2xl border border-border border-l-4 shadow-sm',
        urgencyBorder,
      ].join(' ')}
    >
      <Link
        to={`/customers/${target.customerId}`}
        className="block px-4 py-3 transition active:bg-surface-2/80"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{target.name}</p>
              <LineBadge linked={target.hasLine} />
            </div>
            <p className="mt-1 text-sm font-bold tracking-tight text-ink">{target.plate}</p>
            <p className="mt-0.5 text-xs text-ink-3">
              {target.maker} {target.model}
              {target.phone ? ` · ${target.phone}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {isOil ? (
              <>
                <p className="text-sm font-bold tabular-nums text-ink">
                  {formatKm(target.estimatedMileage)}
                </p>
                {target.oilOverageKm != null && target.oilOverageKm >= 0 && (
                  <p className="mt-0.5 text-xs font-semibold text-warn">
                    目安超過 {formatKm(target.oilOverageKm)}
                  </p>
                )}
                {target.nextOilTargetKm != null && (
                  <p className="mt-0.5 text-xs text-ink-3">目安 {formatKm(target.nextOilTargetKm)}</p>
                )}
              </>
            ) : (
              <>
                <p
                  className={[
                    'text-sm font-bold tabular-nums',
                    daysOverdue ? 'text-danger' : 'text-ink',
                  ].join(' ')}
                >
                  {formatDays(target.daysUntilInspection)}
                </p>
                <p className="mt-0.5 text-xs text-ink-3">{formatDate(target.inspectionExpireDate)}</p>
              </>
            )}
          </div>
        </div>
        {!target.hasConsent && (
          <p className="mt-2 inline-flex rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
            配信停止
          </p>
        )}
      </Link>
      <div className="border-t border-border bg-surface/80 px-4 py-3">
        <Button
          className="min-h-11 w-full text-sm"
          disabled={!target.hasLine || !target.hasConsent}
          onClick={onSend}
        >
          {!target.hasLine ? 'LINE 未紐付のため送信不可' : 'LINE 送信'}
        </Button>
      </div>
    </li>
  );
}
