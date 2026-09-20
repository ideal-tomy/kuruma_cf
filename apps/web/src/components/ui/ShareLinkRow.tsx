import { Button } from './Button';

type Props = {
  label: string;
  description?: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
};

export function ShareLinkRow({ label, description, url, copied, onCopy }: Props) {
  return (
    <li className="rounded-xl border border-border bg-surface px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface-2 px-3 text-sm font-semibold text-accent"
        >
          開く
        </a>
        <Button
          variant="secondary"
          className="min-h-11 flex-1 px-3"
          onClick={onCopy}
        >
          {copied ? 'コピー済' : 'コピー'}
        </Button>
      </div>
    </li>
  );
}
