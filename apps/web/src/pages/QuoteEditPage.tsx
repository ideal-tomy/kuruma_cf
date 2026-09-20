import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { SendFlowLocationState } from '../lib/sendFlow';
import { fetchVehicleQuotes, generateQuote, updateQuote } from '../lib/api';
import type { Quote, QuoteLineItem } from '../lib/types';
import { formatPrice, formatYen } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { ShareLinkRow } from '../components/ui/ShareLinkRow';
import { SubPageHeader } from '../components/ui/SubPageHeader';
import { Toast } from '../components/ui/Toast';

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
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
  };

  const updateLine = (
    section: 'legal' | 'service',
    index: number,
    field: 'label' | 'unit_price' | 'quantity',
    value: string,
  ) => {
    const setter = section === 'legal' ? setLegalItems : setServiceItems;
    setter((items) =>
      items.map((item, i) => {
        if (i !== index) return item;
        if (field === 'label') return { ...item, label: value };
        const num = Number(value) || 0;
        if (field === 'quantity') {
          const quantity = Math.max(1, Math.round(num));
          return { ...item, quantity, amount: quantity * item.unit_price };
        }
        const unit_price = Math.round(num);
        return { ...item, unit_price, amount: item.quantity * unit_price };
      }),
    );
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

  const renderSection = (title: string, section: 'legal' | 'service', items: QuoteLineItem[]) => (
    <section className="rounded-2xl bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-bold text-accent">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li key={`${section}-${index}`} className="space-y-2 border-b border-border pb-3 last:border-0">
            <Field label="項目名">
              <input
                className={inputClass}
                value={item.label}
                onChange={(e) => updateLine(section, index, 'label', e.target.value)}
              />
            </Field>
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
                  value={String(item.quantity)}
                  onChange={(e) => updateLine(section, index, 'quantity', e.target.value)}
                />
              </Field>
            </div>
            <p className="text-right text-sm font-semibold tabular-nums">{formatYen(item.amount)}</p>
          </li>
        ))}
      </ul>
    </section>
  );

  const returnToSend = () => {
    if (!fromSend) return;
    navigate(`/lists/${fromSend.rule}`, { state: { reopenSend: fromSend } });
  };

  return (
    <div className="space-y-4">
      {fromSend && (
        <div className="rounded-xl bg-warn-soft/60 px-3 py-2 text-sm text-ink-2">
          送信前の見積調整 — 保存後「送信確認へ戻る」で LINE 送信を続けられます
        </div>
      )}
      {toast && <Toast message={toast} />}

      <SubPageHeader
        backTo={customerId ? `/customers/${customerId}` : '/customers'}
        backLabel={fromSend ? '送信確認へ' : '顧客詳細'}
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

      {quotes.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quotes.map((q) => (
            <button
              key={q.id}
              type="button"
              className={[
                'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                q.id === activeQuoteId ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2',
              ].join(' ')}
              onClick={() => selectQuote(q.id)}
            >
              {q.quoteNo}
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
          {renderSection('点検基本料・追加整備（税込）', 'service', serviceItems)}

          <section className="rounded-2xl bg-surface p-4 shadow-sm">
            <Field label="備考">
              <textarea
                className={`${inputClass} min-h-24`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <p className="mt-4 text-right text-lg font-bold text-accent">
              合計 {formatPrice(grandTotal)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="min-h-11 flex-1"
                disabled={saving}
                onClick={async () => {
                  if (!activeQuoteId) return;
                  setSaving(true);
                  try {
                    await updateQuote(activeQuoteId, {
                      legalItems,
                      serviceItems,
                      notes,
                      status: 'ISSUED',
                    });
                    await reload();
                    setToast('保存して発行しました');
                    if (fromSend) {
                      setTimeout(returnToSend, 500);
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? '保存中…' : fromSend ? '保存して送信確認へ' : '保存して発行'}
              </Button>
              {fromSend && (
                <Button variant="secondary" className="min-h-11" onClick={returnToSend}>
                  送信確認へ戻る
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-accent-soft/40 p-4">
            <p className="text-sm font-bold text-accent">共有リンク</p>
            <p className="mt-1 text-xs text-ink-3">LINE 送信前に「コピー」で貼り付け、または「開く」でプレビュー</p>
            <ul className="mt-3 space-y-2">
              {shareUrl && (
                <ShareLinkRow
                  label="見積印刷"
                  description="見積詳細・印刷用ページ"
                  url={shareUrl}
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
    </div>
  );
}
