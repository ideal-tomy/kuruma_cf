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

export function SubPageHeader({ backTo, backLabel, title, subtitle, action, onBack }: Props) {
  return (
    <div className="space-y-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-block text-sm font-semibold text-accent"
        >
          ‹ {backLabel}
        </button>
      ) : (
        <Link to={backTo} className="inline-block text-sm font-semibold text-accent">
          ‹ {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
