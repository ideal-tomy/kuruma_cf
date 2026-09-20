import { useState } from 'react';
import type { VehicleInput } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field, inputClass } from '../ui/Field';

type Props = {
  initial?: Partial<VehicleInput>;
  submitLabel: string;
  onSubmit: (input: VehicleInput) => Promise<void>;
  onCancel?: () => void;
};

export function VehicleForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [maker, setMaker] = useState(initial?.maker ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [plate, setPlate] = useState(initial?.plate ?? '');
  const [inspectionExpireDate, setInspectionExpireDate] = useState(
    initial?.inspectionExpireDate ?? '',
  );
  const [initialMileage, setInitialMileage] = useState(
    initial?.initialMileage != null ? String(initial.initialMileage) : '0',
  );
  const [monthlyAvgKm, setMonthlyAvgKm] = useState(
    initial?.monthlyAvgKm != null ? String(initial.monthlyAvgKm) : '',
  );
  const [lastOilChangeMileage, setLastOilChangeMileage] = useState(
    initial?.lastOilChangeMileage != null ? String(initial.lastOilChangeMileage) : '',
  );
  const [oilIntervalKm, setOilIntervalKm] = useState(
    initial?.oilIntervalKm != null ? String(initial.oilIntervalKm) : '4000',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!maker.trim() || !model.trim() || !plate.trim() || !inspectionExpireDate) {
          setError('メーカー・車種・ナンバー・車検満了日は必須です');
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await onSubmit({
            maker: maker.trim(),
            model: model.trim(),
            plate: plate.trim(),
            inspectionExpireDate,
            initialMileage: Number(initialMileage) || 0,
            monthlyAvgKm: monthlyAvgKm ? Number(monthlyAvgKm) : null,
            lastOilChangeMileage: lastOilChangeMileage ? Number(lastOilChangeMileage) : null,
            oilIntervalKm: Number(oilIntervalKm) || 4000,
          });
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : '保存に失敗しました');
        } finally {
          setSaving(false);
        }
      }}
    >
      <Field label="メーカー *">
        <input className={inputClass} value={maker} onChange={(e) => setMaker(e.target.value)} />
      </Field>
      <Field label="車種 *">
        <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} />
      </Field>
      <Field label="ナンバー *">
        <input className={inputClass} value={plate} onChange={(e) => setPlate(e.target.value)} />
      </Field>
      <Field label="車検満了日 *">
        <input
          className={inputClass}
          type="date"
          value={inspectionExpireDate}
          onChange={(e) => setInspectionExpireDate(e.target.value)}
        />
      </Field>
      <Field label="走行距離（km）">
        <input
          className={inputClass}
          inputMode="numeric"
          value={initialMileage}
          onChange={(e) => setInitialMileage(e.target.value)}
        />
      </Field>
      <Field label="月平均走行（km）">
        <input
          className={inputClass}
          inputMode="numeric"
          value={monthlyAvgKm}
          onChange={(e) => setMonthlyAvgKm(e.target.value)}
        />
      </Field>
      <Field label="前回オイル交換時走行（km）">
        <input
          className={inputClass}
          inputMode="numeric"
          value={lastOilChangeMileage}
          onChange={(e) => setLastOilChangeMileage(e.target.value)}
        />
      </Field>
      <Field label="オイル交換間隔（km）">
        <input
          className={inputClass}
          inputMode="numeric"
          value={oilIntervalKm}
          onChange={(e) => setOilIntervalKm(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? '保存中…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
        )}
      </div>
    </form>
  );
}
