import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchHealth, fetchHome, type HomeResponse } from '../lib/api';
import {
  isListRule,
  LIST_RULE_LABELS,
  listRuleCountClass,
  listRuleLabelClass,
  listRuleRowBorderClass,
  sortHomeLists,
} from '../lib/listRules';

export function HomePage() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchHome(), fetchHealth()])
      .then(([homeData, health]) => {
        setHome(homeData);
        setDbOk(health.db);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      });
  }, []);

  const needsTotal =
    (home?.needsAction.lineUnmatched ?? 0) + (home?.needsAction.sendFailed ?? 0);

  const sortedLists = sortHomeLists(home?.lists ?? []);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-sm font-bold text-ink-2">要対応</p>
        {needsTotal === 0 ? (
          <p className="mt-2 text-sm text-ink-3">対応が必要な項目はありません</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {home!.needsAction.lineUnmatched > 0 && (
              <li>
                <Link
                  to="/line-unmatched"
                  className="flex min-h-11 items-center font-semibold text-warn"
                >
                  LINE 未紐付 {home!.needsAction.lineUnmatched}件 ›
                </Link>
              </li>
            )}
            {home!.needsAction.sendFailed > 0 && (
              <li>
                <Link
                  to="/history?status=FAILED"
                  className="flex min-h-11 items-center font-semibold text-danger"
                >
                  送信失敗 {home!.needsAction.sendFailed}件 ›
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="text-sm font-bold text-ink-2">今週の案内候補</p>
        <p className="mt-1 text-xs text-ink-3">上から緊急度が高い順です</p>
        <ul className="mt-3 space-y-2">
          {sortedLists.map(({ rule, count }) => {
            const label = isListRule(rule) ? LIST_RULE_LABELS[rule] : rule;
            const borderClass = isListRule(rule) ? listRuleRowBorderClass(rule) : 'border-l-border';
            const zero = count === 0;
            return (
              <li key={rule}>
                <Link
                  to={`/lists/${rule}`}
                  className={[
                    'flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border border-l-4 px-3 py-2.5 transition',
                    borderClass,
                    zero ? 'opacity-60' : 'hover:bg-surface-2 active:bg-surface-2',
                  ].join(' ')}
                >
                  <span className={`text-sm ${listRuleLabelClass(rule)}`}>{label}</span>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${listRuleCountClass(rule)}`}>
                    {count}件 ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {error && (
        <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{error}</p>
        </section>
      )}

      {dbOk === false && (
        <section className="rounded-2xl border border-border bg-accent-soft/40 p-4">
          <p className="text-sm text-ink">
            データベース未接続 — <code className="text-xs">npm run db:migrate:local</code>{' '}
            を実行してください
          </p>
        </section>
      )}
    </div>
  );
}
