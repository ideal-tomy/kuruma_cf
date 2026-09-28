import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  onBack?: () => void;
};

const backClass =
  'inline-flex min-h-11 items-center gap-1 pr-3 text-base font-semibold text-accent active:opacity-70';

export function SubPageHeader({ backTo, backLabel, title, subtitle, action, onBack }: Props) {
  return (
    <>
      <div className="sticky top-14 z-10 -mx-4 -mt-5 border-b border-border bg-bg/95 px-4 backdrop-blur-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            <span aria-hidden="true" className="text-xl leading-none">‹</span>
            {backLabel}へ戻る
          </button>
        ) : (
          <Link to={backTo} className={backClass}>
            <span aria-hidden="true" className="text-xl leading-none">‹</span>
            {backLabel}へ戻る
          </Link>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </div>
    </>
  );
}
