import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { SendFlowLocationState } from '../lib/sendFlow';
import { fetchVehicleQuotes, generateQuote, updateQuote } from '../lib/api';
import type { Quote, QuoteLineItem } from '../lib/types';
import { formatPrice, formatQuoteTabLabel, formatYen } from '../lib/format';
import { sameOriginHref, staffPreviewHref } from '../lib/previewUrl';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { ShareLinkRow } from '../components/ui/ShareLinkRow';
import { SubPageHeader } from '../components/ui/SubPageHeader';
import { Toast } from '../components/ui/Toast';

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

const EMPTY_SERVICE_LINE: QuoteLineItem = {
  label: '',
  amount: 0,
  quantity: 1,
  unit_price: 0,
  tax_treatment: 'TAXABLE_10',
  category: 'service',
};

function quantityDraftKey(section: 'legal' | 'service', index: number) {
  return `${section}:${index}`;
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QuoteEditPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromSend = (location.state as SendFlowLocationState | null)?.fromSend;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [legalItems, setLegalItems] = useState<QuoteLineItem[]>([]);
  const [serviceItems, setServiceItems] = useState<QuoteLineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [optOutUrl, setOptOutUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeQuote = useMemo(
    () => quotes.find((q) => q.id === activeQuoteId) ?? null,
    [quotes, activeQuoteId],
  );

  const grandTotal = useMemo(() => {
    const sum = (items: QuoteLineItem[]) => items.reduce((a, i) => a + i.amount, 0);
    return sum(legalItems) + sum(serviceItems);
  }, [legalItems, serviceItems]);

  const reload = useCallback(async () => {
    if (!vehicleId) return;
    const data = await fetchVehicleQuotes(vehicleId);
    setVehicleLabel(`${data.vehicle.plate} · ${data.vehicle.maker} ${data.vehicle.model}`);
    setCustomerId(data.vehicle.customerId);
    setQuotes(data.quotes);
    const pick = data.quotes[0] ?? null;
    setActiveQuoteId(pick?.id ?? null);
    if (pick) {
      setLegalItems(pick.legalItems);
      setServiceItems(pick.serviceItems);
      setNotes(pick.notes ?? '');
      setShareUrl(data.shareUrlsByQuoteId[pick.id] ?? null);
    }
    setPortalUrl(data.portalUrl);
    setOptOutUrl(data.optOutUrl);
    setQuantityDrafts({});
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
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
  }, [vehicleId, reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectQuote = async (id: string) => {
    if (!vehicleId) return;
    const data = await fetchVehicleQuotes(vehicleId);
    const q = data.quotes.find((x) => x.id === id);
    if (!q) return;
    setActiveQuoteId(id);
    setLegalItems(q.legalItems);
    setServiceItems(q.serviceItems);
    setNotes(q.notes ?? '');
    setShareUrl(data.shareUrlsByQuoteId[id] ?? null);
    setQuantityDrafts({});
  };

  const applyQuantity = (section: 'legal' | 'service', index: number, quantity: number) => {
    const q = Math.max(1, Math.round(quantity));
    const setter = section === 'legal' ? setLegalItems : setServiceItems;
    setter((items) =>
      items.map((item, i) => {
        if (i !== index) return item;
        return { ...item, quantity: q, amount: q * item.unit_price };
      }),
    );
  };

  const handleQuantityChange = (section: 'legal' | 'service', index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const key = quantityDraftKey(section, index);
    setQuantityDrafts((drafts) => ({ ...drafts, [key]: value }));
    if (value !== '') {
      applyQuantity(section, index, Number(value));
    }
  };

  const handleQuantityBlur = (section: 'legal' | 'service', index: number) => {
    const key = quantityDraftKey(section, index);
    const raw = quantityDrafts[key];
    setQuantityDrafts((drafts) => {
      if (!(key in drafts)) return drafts;
      const next = { ...drafts };
      delete next[key];
      return next;
    });
    if (raw === undefined) return;
    const parsed = raw === '' ? 1 : Math.max(1, Math.round(Number(raw)) || 1);
    applyQuantity(section, index, parsed);
  };

  const updateLine = (
    section: 'legal' | 'service',
    index: number,
    field: 'label' | 'unit_price',
    value: string,
  ) => {
    const setter = section === 'legal' ? setLegalItems : setServiceItems;
    setter((items) =>
      items.map((item, i) => {
        if (i !== index) return item;
        if (field === 'label') return { ...item, label: value };
        const num = Number(value) || 0;
        const unit_price = Math.round(num);
        return { ...item, unit_price, amount: item.quantity * unit_price };
      }),
    );
  };

  const addServiceLine = () => {
    setServiceItems((items) => [...items, { ...EMPTY_SERVICE_LINE }]);
  };

  const removeServiceLine = (index: number) => {
    setServiceItems((items) => items.filter((_, i) => i !== index));
    setPendingDelete(null);
    setQuantityDrafts({});
  };

  if (!vehicleId) return null;
  if (loading) return <p className="text-sm text-ink-3">読み込み中…</p>;

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-danger">{error}</p>
        <Link to="/customers" className="text-sm font-semibold text-accent">
          顧客へ戻る
        </Link>
      </div>
    );
  }

  const renderSection = (
    title: string,
    section: 'legal' | 'service',
    items: QuoteLineItem[],
    mutable = false,
  ) => (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-bold text-accent">{title}</h3>
      {items.length === 0 && (
        <p className="mt-3 text-sm text-ink-3">項目はまだありません</p>
      )}
      <ul className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={`${section}-${index}`} className="space-y-2 border-b border-border pb-3 last:border-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Field label="項目名">
                  <input
                    className={inputClass}
                    value={item.label}
                    onChange={(e) => updateLine(section, index, 'label', e.target.value)}
                  />
                </Field>
              </div>
              {mutable && (
                <button
                  type="button"
                  className="mt-6 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-danger"
                  aria-label="この項目を削除"
                  onClick={() => setPendingDelete(index)}
                >
                  <TrashIcon />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="単価">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(item.unit_price)}
                  onChange={(e) => updateLine(section, index, 'unit_price', e.target.value)}
                />
              </Field>
              <Field label="数量">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={
                    quantityDrafts[quantityDraftKey(section, index)] ?? String(item.quantity)
                  }
                  onChange={(e) => handleQuantityChange(section, index, e.target.value)}
                  onBlur={() => handleQuantityBlur(section, index)}
                />
              </Field>
            </div>
            <p className="text-right text-sm font-semibold tabular-nums">{formatYen(item.amount)}</p>
          </li>
        ))}
      </ul>
      {mutable && (
        <Button variant="secondary" className="mt-3 min-h-11 w-full" onClick={addServiceLine}>
          項目を追加
        </Button>
      )}
    </section>
  );

  const returnToSend = () => {
    if (!fromSend) return;
    navigate(`/lists/${fromSend.rule}`, { state: { reopenSend: fromSend } });
  };

  const backTo = customerId ? `/customers/${customerId}` : '/customers';

  const handleSave = async () => {
    if (!activeQuoteId) return;
    if (serviceItems.some((item) => !item.label.trim())) {
      setSaveError('項目名が空の行があります。名前を入れるか、その行を削除してください。');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await updateQuote(activeQuoteId, {
        legalItems,
        serviceItems,
        notes,
        status: 'ISSUED',
      });
      await reload();
      setToast('保存しました。お客様の画面にも反映されています');
      if (fromSend) {
        setTimeout(returnToSend, 500);
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={activeQuote ? 'space-y-4 pb-32' : 'space-y-4'}>
      <SubPageHeader
        backTo={backTo}
        backLabel={fromSend ? '送信確認' : '顧客詳細'}
        onBack={fromSend ? returnToSend : undefined}
        title="見積編集"
        subtitle={vehicleLabel}
        action={
          <Button
            variant="secondary"
            onClick={async () => {
              await generateQuote(vehicleId, { includeOil: true });
              await reload();
            }}
          >
            自動生成
          </Button>
        }
      />

      {fromSend && (
        <div className="rounded-xl bg-warn-soft/60 px-3 py-2 text-sm text-ink-2">
          送信前の見積の確認です。保存すると送信確認に戻ります。
        </div>
      )}

      {quotes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quotes.map((q, index) => (
            <button
              key={q.id}
              type="button"
              className={[
                'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                q.id === activeQuoteId ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2',
              ].join(' ')}
              onClick={() => selectQuote(q.id)}
            >
              {formatQuoteTabLabel(q, index)}
            </button>
          ))}
        </div>
      )}

      {!activeQuote ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-ink-3">
          見積がありません。「自動生成」でたたき台を作成できます。
        </div>
      ) : (
        <>
          {renderSection('法定費用（非課税）', 'legal', legalItems)}
          {renderSection('点検基本料・追加整備（税込）', 'service', serviceItems, true)}

          <section className="rounded-2xl bg-surface p-4 shadow-sm">
            <Field label="備考">
              <textarea
                className={`${inputClass} min-h-24`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </section>

          <section className="rounded-2xl bg-accent-soft/40 p-4">
            <p className="text-sm font-bold text-accent">お客様に見える画面</p>
            <p className="mt-1 text-xs text-ink-3">
              「開く」で保存済みの内容を確認できます。「コピー」は LINE などに貼り付ける用です。
            </p>
            <ul className="mt-3 space-y-2">
              {shareUrl && (
                <ShareLinkRow
                  label="見積印刷"
                  description="見積詳細・印刷用ページ"
                  url={shareUrl}
                  openHref={staffPreviewHref(shareUrl)}
                  copied={copied === 'quote'}
                  onCopy={() => {
                    copyText(shareUrl);
                    setCopied('quote');
                    setToast('リンクをコピーしました');
                  }}
                />
              )}
              {portalUrl && (
                <ShareLinkRow
                  label="顧客ポータル"
                  description="お車・見積概要（LINE 本文のリンク先）"
                  url={portalUrl}
                  openHref={staffPreviewHref(portalUrl)}
                  copied={copied === 'portal'}
                  onCopy={() => {
                    copyText(portalUrl);
                    setCopied('portal');
                    setToast('リンクをコピーしました');
                  }}
                />
              )}
              {optOutUrl && (
                <ShareLinkRow
                  label="配信停止"
                  description="顧客が案内を止めるとき用（通常は LINE 本文に含まれる）"
                  url={optOutUrl}
                  openHref={sameOriginHref(optOutUrl)}
                  copied={copied === 'optout'}
                  onCopy={() => {
                    copyText(optOutUrl);
                    setCopied('optout');
                    setToast('リンクをコピーしました');
                  }}
                />
              )}
            </ul>
          </section>
        </>
      )}

      {activeQuote && (
        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg border-t border-border bg-surface/95 px-4 pt-2 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm">
          {toast && <Toast message={toast} />}
          {saveError && <Toast message={saveError} tone="error" />}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-3">合計（税込）</span>
            <span className="text-lg font-bold tabular-nums text-accent">{formatPrice(grandTotal)}</span>
          </div>
          <div className="mt-2 flex gap-2">
            {fromSend ? (
              <Button variant="secondary" className="min-h-12 px-4" onClick={returnToSend}>
                戻る
              </Button>
            ) : (
              <Link
                to={backTo}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-ink"
              >
                戻る
              </Link>
            )}
            <Button className="min-h-12 flex-1 text-base" disabled={saving} onClick={handleSave}>
              {saving ? '保存中…' : fromSend ? '保存して送信確認へ' : '保存して発行'}
            </Button>
          </div>
        </div>
      )}

      {pendingDelete != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-line-title"
            className="w-full max-w-sm rounded-2xl bg-surface p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p id="delete-line-title" className="text-base font-bold text-ink">
              この項目を削除しますか
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {serviceItems[pendingDelete]?.label.trim() || '（項目名なし）'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="min-h-11 flex-1"
                onClick={() => setPendingDelete(null)}
              >
                キャンセル
              </Button>
              <Button
                variant="danger"
                className="min-h-11 flex-1"
                onClick={() => removeServiceLine(pendingDelete)}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
