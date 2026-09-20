type Props = {
  linked: boolean;
  className?: string;
};

export function LineBadge({ linked, className = '' }: Props) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold',
        linked ? 'bg-line-green/15 text-line-green' : 'bg-surface-2 text-ink-3',
        className,
      ].join(' ')}
      title={linked ? 'LINE 紐付済' : 'LINE 未紐付'}
    >
      {linked ? 'LINE' : '—'}
    </span>
  );
}
