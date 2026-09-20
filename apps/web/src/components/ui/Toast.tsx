type Props = {
  message: string;
  tone?: 'success' | 'error';
};

export function Toast({ message, tone = 'success' }: Props) {
  return (
    <p
      className={[
        'rounded-xl px-3 py-2 text-sm font-medium',
        tone === 'success' ? 'bg-accent-soft text-accent' : 'bg-danger/10 text-danger',
      ].join(' ')}
      role="status"
    >
      {message}
    </p>
  );
}
