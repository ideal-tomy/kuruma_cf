import { useState } from 'react';
import type { CustomerInput } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/Field';

type Props = {
  initial?: Partial<CustomerInput>;
  submitLabel: string;
  onSubmit: (input: CustomerInput) => Promise<void>;
  onCancel?: () => void;
  /** LINE 未紐付から来たときだけ true（通常は非表示） */
  showLineLinked?: boolean;
};

export function CustomerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  showLineLinked = false,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [furigana, setFurigana] = useState(initial?.furigana ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [lineUserId] = useState(initial?.lineUserId ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError('名前は必須です');
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await onSubmit({
            name: name.trim(),
            furigana: furigana.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            lineUserId: lineUserId.trim() || undefined,
            notes: notes.trim() || undefined,
          });
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : '保存に失敗しました');
        } finally {
          setSaving(false);
        }
      }}
    >
      {showLineLinked && lineUserId && (
        <div className="rounded-xl bg-line-green/10 px-3 py-2 text-sm text-ink-2">
          LINE 友だち追加済み — 登録後に自動で紐付けます
        </div>
      )}

      <Field label="お名前 *">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </Field>
      <Field label="ふりがな">
        <input className={inputClass} value={furigana} onChange={(e) => setFurigana(e.target.value)} />
      </Field>
      <Field label="電話">
        <input
          className={inputClass}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
      </Field>
      <Field label="メール">
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Field>
      <Field label="メモ">
        <textarea
          className={`${inputClass} min-h-20`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" className="min-h-11 flex-1" disabled={saving}>
          {saving ? '保存中…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
