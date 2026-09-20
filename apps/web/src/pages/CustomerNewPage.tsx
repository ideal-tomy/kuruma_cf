import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createCustomer, createVehicle } from '../lib/api';
import type { CustomerInput } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { SubPageHeader } from '../components/ui/SubPageHeader';

export function CustomerNewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lineUserId = params.get('lineUserId') ?? undefined;

  const [name, setName] = useState('');
  const [furigana, setFurigana] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [plate, setPlate] = useState('');
  const [maker, setMaker] = useState('');
  const [model, setModel] = useState('');
  const [inspectionExpireDate, setInspectionExpireDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVehicleInput = plate.trim() || maker.trim() || model.trim() || inspectionExpireDate;

  return (
    <div className="space-y-4">
      <SubPageHeader backTo="/customers" backLabel="顧客一覧" title="新規顧客" />

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('お名前は必須です');
            return;
          }
          if (
            hasVehicleInput &&
            (!plate.trim() || !maker.trim() || !model.trim() || !inspectionExpireDate)
          ) {
            setError('お車を登録する場合は、ナンバー・車種・車検満了日をすべて入力してください');
            return;
          }
          setSaving(true);
          setError(null);
          try {
            const input: CustomerInput = {
              name: name.trim(),
              furigana: furigana.trim() || undefined,
              phone: phone.trim() || undefined,
              email: email.trim() || undefined,
              lineUserId: lineUserId?.trim() || undefined,
              notes: notes.trim() || undefined,
            };
            const customer = await createCustomer(input);
            if (hasVehicleInput) {
              await createVehicle(customer.id, {
                plate: plate.trim(),
                maker: maker.trim(),
                model: model.trim(),
                inspectionExpireDate,
              });
            }
            navigate(`/customers/${customer.id}`);
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '登録に失敗しました');
          } finally {
            setSaving(false);
          }
        }}
      >
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="mb-4 text-sm font-bold text-ink">1. お客様</p>

          {lineUserId && (
            <div className="mb-4 rounded-xl bg-line-green/10 px-3 py-2 text-sm text-ink-2">
              LINE 友だち追加済み — 登録後に自動で紐付けます
            </div>
          )}

          <div className="space-y-4">
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
              />
            </Field>
            <Field label="メール">
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="メモ">
              <textarea
                className={`${inputClass} min-h-20`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <p className="text-sm font-bold text-ink">2. お車（任意）</p>
          <p className="mt-1 text-xs text-ink-3">
            店頭で聞ける項目だけ。あとから詳細ページでも追加できます。
          </p>
          <div className="mt-4 space-y-4">
            <Field label="ナンバー">
              <input
                className={inputClass}
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="例: 横浜 301 あ 1001"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="メーカー">
                <input
                  className={inputClass}
                  value={maker}
                  onChange={(e) => setMaker(e.target.value)}
                  placeholder="トヨタ"
                />
              </Field>
              <Field label="車種">
                <input
                  className={inputClass}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="ヤリス"
                />
              </Field>
            </div>
            <Field label="車検満了日">
              <input
                className={inputClass}
                type="date"
                value={inspectionExpireDate}
                onChange={(e) => setInspectionExpireDate(e.target.value)}
              />
            </Field>
          </div>
        </section>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" className="min-h-11 flex-1" disabled={saving}>
            {saving ? '登録中…' : '登録する'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            onClick={() => navigate('/customers')}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
