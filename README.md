# kuruma_cf — Shaken Notify（Cloudflare 版）

正本: [docs/cf-rebuild/kuruma-実装PLAN.md](../docs/cf-rebuild/kuruma-実装PLAN.md)

Supabase / Vercel 版（[`kurumakanri/`](../kurumakanri/)）を Cloudflare 上で作り直す v1 です。

## 構成

```text
kuruma_cf/
  apps/web/           Vite + React（管理画面 SPA）
  workers/app/        Hono（/api/* + 将来 /p /q /u /webhook/line）
  packages/quote/     見積計算（Phase 2 で quote.ts 移植）
  migrations/         D1 SQL
  seed/               デモデータ（Phase 1 以降）
  wrangler.toml
```

nail_cf（ポート 8787）と **リソース・ポートを共有しません**。ローカルは **8788**。

---

## 前提

- Node.js 20+
- Cloudflare アカウント（本番デプロイ時）
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（`npm install` で同梱）

---

## ローカル開発

```bash
cd kuruma_cf
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

ブラウザ: http://localhost:8788

### デモ用ログイン

| 項目 | 初期値 |
| --- | --- |
| メール | `demo@example.com` |
| パスワード | `changeme` |

変更する場合は `.env.example` を `.dev.vars` にコピーして編集（Git にコミットしない）。

```bash
copy .env.example .dev.vars
```

### フロントのみホットリロード

別ターミナルで `npm run dev:web`（API は `wrangler dev` が 8788 で動いている必要あり）

---

## Phase 0 受け入れ

- [x] 未ログインでは `/login` 以外見えない
- [x] ログイン後、ホームに「要対応」「今週の案内候補」が出る
- [x] フッタに ホーム / 顧客 / LINE / 履歴 タブがある

## Phase 1 受け入れ

```bash
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

- [x] seed 後、ホームの案内候補件数が `backup/kuruma/v_targets_*.csv` と一致する（2026-09-20 時点: overdue 6 / 30日 1 / 90日 2 / 180日 1 / oil 19）
- [x] 各リスト（`/lists/:rule`）で名前・ナンバー・残日（または走行）が表示される
- [x] 顧客一覧・詳細・新規で CRUD できる（車両の追加・編集含む）

seed の再生成: `npm run seed:generate`（`backup/kuruma/*.csv` から `seed/demo.sql` を生成）

## Phase 2 受け入れ

- [x] 顧客詳細 → 車両の「見積」→ 自動生成・編集・保存できる
- [x] 見積共有リンク `/q/:token` を別端末で開き、3分類（法定 / 点検基本 / 追加）と店舗名が読める
- [x] 顧客ポータル `/p/:token` で車両・見積概要・整備履歴が見える
- [x] 配信停止 `/u/:token?confirm=1` で consents が opt_out になる

ポータル用 secrets（本番）: `CUSTOMER_PORTAL_SECRET`, `QUOTE_SHARE_SECRET`, `OPT_OUT_SECRET`, `ISSUER_JSON`, `SITE_URL`

## Phase 3 受け入れ

- [x] リストから LINE 送信 → 履歴に SENT（トークン未設定時は mock 送信）
- [x] 同日・同ルール・同顧客の再送が冪等キーでブロックされる
- [x] 送信失敗がホーム「要対応」に表示され、履歴から再送できる
- [x] `POST /webhook/line` で友だち追加 → LINE 未紐付一覧に表示 → 顧客に結びつけられる

LINE secrets（本番）: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`  
開発で冪等を無効化: `NOTIFICATION_IDEMPOTENCY_DISABLED=true`

### LINE Webhook URL（本番）

LINE Developers コンソールの Webhook URL:

```text
https://<your-worker>.workers.dev/webhook/line
```

ローカル検証は ngrok 等でトンネルするか、`tmp-webhook.json` を使って curl で POST する。

## Phase 4 受け入れ

### 週次シナリオ（理想 UI A〜D）

| シナリオ | 流れ | 確認ポイント |
| --- | --- | --- |
| A 月曜朝 | ホーム → リスト → 送信シート → 送信 → 履歴 | 15〜30分で一周。要対応（未紐付・失敗）がホームから消えない |
| B 友だち追加 | Webhook → ホーム「LINE 未紐付」→ 顧客に紐付 | Developers コンソール不要 |
| C 個別送信 | 顧客検索 → 見積確認 → リスト/詳細から送信 | ナンバー・名前が切れない |
| D 顧客側 | LINE リンク → `/p` / `/q` | ログイン不要・店舗名表示 |

### v1 完了チェック（A10）

- [x] ホームを開けば今週の候補件数と要対応が分かる
- [x] リストから確認して送信するとログが残る
- [x] 同日同ルール同チャネルの二重送信が防げる
- [x] 見積が3分類で表示・編集できる
- [x] 署名リンクで `/p` `/q` がログインなしで読める
- [x] `/u` で配信停止すると次の抽出から外れる
- [x] 未紐付 LINE を顧客に結べる
- [x] 旧 Supabase に依存しない

### Cron dry-run（自動抽出）

`AUTO_SEND_ENABLED=false`（既定）の間、Cron は **候補件数の集計と audit_logs 記録のみ** 行い、`notification_jobs` には投入しません。

```bash
# 手動 dry-run（ログイン後）
curl -s -b tmp-cookies.txt -X POST http://localhost:8788/api/cron/daily-extract

# 直近の実行結果
curl -s -b tmp-cookies.txt http://localhost:8788/api/cron/daily-extract/last
```

本番 Cron: `wrangler.toml` の `[triggers]` — 毎日 08:00 JST（UTC 23:00）。  
自動投入を有効化する場合のみ `AUTO_SEND_ENABLED=true` に変更（運用合意後）。

---

## 本番環境（デプロイ済み）

| 項目 | URL |
| --- | --- |
| 管理画面 | https://kuruma-cf.ryojitomii.workers.dev |
| ヘルス | https://kuruma-cf.ryojitomii.workers.dev/api/health |
| LINE Webhook | https://kuruma-cf.ryojitomii.workers.dev/webhook/line |

詳細: [docs/cf-rebuild/kuruma-本番セットアップ.md](../docs/cf-rebuild/kuruma-本番セットアップ.md)

**デモログイン:** `demo@example.com` / パスワードは `kuruma_cf/.production-secrets.json` の `DEMO_PASSWORD`（初回 `npm run secrets:generate` 時にコンソールにも表示）。

**LINE 準備後:** `.production-secrets.json` にトークンを追記 → `npm run secrets:line` のみ。

---

## Cloudflare 本番セットアップ（初回のみ）

### 1. ログイン

```bash
npx wrangler login
```

### 2. D1 データベース

```bash
npx wrangler d1 create kuruma-db
```

出力された `database_id` を [`wrangler.toml`](wrangler.toml) の `[[d1_databases]]` → `database_id` に貼り付ける。

### 3. マイグレーション（本番 D1）

```bash
npm run db:migrate:remote
```

### 4. 秘密情報（本番）

```bash
npm run secrets:generate      # .production-secrets.json（Git 無視）
npm run secrets:production    # Worker へ一括反映（deploy 後）
# LINE 準備後
npm run secrets:line          # LINE トークンのみ追加反映
```

`wrangler.toml` の `[vars]` には秘密情報を置かない（vars と secret の同名競合を避ける）。ローカルは `.dev.vars`。

### 5. デプロイ

```bash
npm run deploy
```

---

## 実装フェーズ

| Phase | 内容 | 状態 |
| --- | --- | --- |
| 0 | 器（health、ログイン、空ホーム） | 完了 |
| 1 | マスタと抽出ホーム | 完了 |
| 2 | 見積とポータル `/p` `/q` `/u` | 完了 |
| 3 | LINE 送信・Webhook・未紐付 | 完了 |
| 4 | 週次シナリオ・Cron dry-run | 完了 |

---

## よくあるつまずき

| 症状 | 対処 |
| --- | --- |
| `database: 未接続` | `npm run db:migrate:local` を実行してから `wrangler dev` を再起動 |
| nail_cf とポート競合 | kuruma は **8788**、nail は 8787 |
| 本番 deploy で D1 エラー | `database_id` が placeholder のまま → `wrangler d1 create` の id を反映 |

---

## Cursor エージェントが止まったとき

[docs/cursor-agent-運用.md](../docs/cursor-agent-運用.md) を参照。

---

## 旧環境との関係

- データ参考: [`backup/kuruma/`](../backup/kuruma/)
- 見積ロジック参考: [`kurumakanri/src/lib/quote.ts`](../kurumakanri/src/lib/quote.ts)
- UI 参考: [`kurumakanri/docs/プロダクト認識と理想UIUX.md`](../kurumakanri/docs/プロダクト認識と理想UIUX.md)
