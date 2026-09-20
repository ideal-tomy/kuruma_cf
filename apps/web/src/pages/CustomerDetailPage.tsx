import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createVehicle,
  getCustomer,
  listServiceHistories,
  updateCustomer,
  updateVehicle,
} from '../lib/api';
import type { ServiceHistory } from '../lib/types';
import { formatDate, formatKm } from '../lib/format';
import type { Customer, Vehicle } from '../lib/types';
import { CustomerForm } from '../components/customers/CustomerForm';
import { VehicleForm } from '../components/customers/VehicleForm';
import { Button } from '../components/ui/Button';
import { SubPageHeader } from '../components/ui/SubPageHeader';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [historiesByVehicle, setHistoriesByVehicle] = useState<Record<string, ServiceHistory[]>>({});

  const reload = useCallback(async () => {
    if (!id) return;
    const data = await getCustomer(id);
    setCustomer(data);
    const map: Record<string, ServiceHistory[]> = {};
    await Promise.all(
      (data.vehicles ?? []).map(async (v) => {
        map[v.id] = await listServiceHistories(v.id);
      }),
    );
    setHistoriesByVehicle(map);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    reload()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  if (!id) return null;

  if (loading) return <p className="text-sm text-ink-3">読み込み中…</p>;

  if (error || !customer) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">{error ?? '顧客が見つかりません'}</p>
        <Link to="/customers" className="text-sm font-semibold text-accent">
          一覧へ戻る
        </Link>
      </div>
    );
  }

  const vehicles = customer.vehicles ?? [];

  return (
    <div className="space-y-4">
      <SubPageHeader
        backTo="/customers"
        backLabel="顧客一覧"
        title={customer.name}
        action={
          <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? '閉じる' : '編集'}
          </Button>
        }
      />

      {editing ? (
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <CustomerForm
            initial={{
              name: customer.name,
              furigana: customer.furigana ?? undefined,
              phone: customer.phone ?? undefined,
              email: customer.email ?? undefined,
              lineUserId: customer.lineUserId ?? undefined,
              notes: customer.notes ?? undefined,
            }}
            submitLabel="更新する"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              const updated = await updateCustomer(id, input);
              setCustomer({ ...updated, vehicles });
              setEditing(false);
            }}
          />
        </section>
      ) : (
        <section className="rounded-2xl bg-surface p-4 shadow-sm">
          <dl className="space-y-2 text-sm">
            {customer.furigana && (
              <div>
                <dt className="text-ink-3">ふりがな</dt>
                <dd>{customer.furigana}</dd>
              </div>
            )}
            {customer.phone && (
              <div>
                <dt className="text-ink-3">電話</dt>
                <dd>{customer.phone}</dd>
              </div>
            )}
            {customer.email && (
              <div>
                <dt className="text-ink-3">メール</dt>
                <dd>{customer.email}</dd>
              </div>
            )}
            {customer.notes && (
              <div>
                <dt className="text-ink-3">メモ</dt>
                <dd className="whitespace-pre-wrap">{customer.notes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-2">登録車両</h3>
          <Button
            variant="secondary"
            onClick={() => {
              setAddingVehicle((v) => !v);
              setEditingVehicleId(null);
            }}
          >
            {addingVehicle ? '閉じる' : '車両を追加'}
          </Button>
        </div>

        {addingVehicle && (
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <VehicleForm
              submitLabel="追加する"
              onCancel={() => setAddingVehicle(false)}
              onSubmit={async (input) => {
                await createVehicle(id, input);
                await reload();
                setAddingVehicle(false);
              }}
            />
          </div>
        )}

        {vehicles.length === 0 ? (
          <p className="text-sm text-ink-3">車両がまだ登録されていません</p>
        ) : (
          <ul className="space-y-3">
            {vehicles.map((vehicle: Vehicle) => (
              <li key={vehicle.id} className="rounded-2xl bg-surface p-4 shadow-sm">
                {editingVehicleId === vehicle.id ? (
                  <VehicleForm
                    initial={{
                      maker: vehicle.maker,
                      model: vehicle.model,
                      plate: vehicle.plate,
                      inspectionExpireDate: vehicle.inspectionExpireDate,
                      initialMileage: vehicle.initialMileage,
                      monthlyAvgKm: vehicle.monthlyAvgKm,
                      lastOilChangeMileage: vehicle.lastOilChangeMileage,
                      oilIntervalKm: vehicle.oilIntervalKm,
                    }}
                    submitLabel="更新する"
                    onCancel={() => setEditingVehicleId(null)}
                    onSubmit={async (input) => {
                      await updateVehicle(vehicle.id, input);
                      await reload();
                      setEditingVehicleId(null);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-accent">{vehicle.plate}</p>
                        <p className="mt-1 text-sm text-ink">
                          {vehicle.maker} {vehicle.model}
                        </p>
                        <p className="mt-2 text-xs text-ink-3">
                          車検満了 {formatDate(vehicle.inspectionExpireDate)} · 走行{' '}
                          {formatKm(vehicle.initialMileage)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Link
                          to={`/quotes/${vehicle.id}`}
                          className="rounded-lg bg-accent px-2 py-1 text-center text-xs font-semibold text-white"
                        >
                          見積
                        </Link>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-xs"
                          onClick={() => setEditingVehicleId(vehicle.id)}
                        >
                          編集
                        </Button>
                      </div>
                    </div>
                    {(historiesByVehicle[vehicle.id] ?? []).length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-xs font-bold text-ink-3">整備履歴</p>
                        <ul className="mt-2 space-y-1">
                          {(historiesByVehicle[vehicle.id] ?? []).slice(0, 3).map((h) => (
                            <li key={h.id} className="text-xs text-ink-2">
                              {formatDate(h.performedAt)} · {h.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
