type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {description && <p className="mt-2 text-xs text-ink-3">{description}</p>}
    </div>
  );
}
