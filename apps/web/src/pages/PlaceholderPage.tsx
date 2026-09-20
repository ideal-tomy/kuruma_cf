type Props = {
  title: string;
  note: string;
};

export function PlaceholderPage({ title, note }: Props) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-3">{note}</p>
    </section>
  );
}
