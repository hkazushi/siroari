<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 変更後の検証（必須）

コードを変更したら、完了報告の前に必ず以下を順に実行し、すべて通ることを確認する。

1. `npx tsc --noEmit` … 型エラーの検出
2. `npm run lint` … Lint
3. `npm run build` … ビルド通過

エラーが残っている状態で「完了しました」と報告しない。
通らない場合は、エラー内容をそのまま提示して指示を仰ぐ。

---

# 会計アプリ（東山メンテナンス 青色申告）

2026-11-26 に旧アプリ「害虫駆除 現場マップ（madorich）」を作り替えた。旧コードはタグ `v1-madorich`。
フォルダ名・package 名は `madorich` のまま（リポジトリ hkazushi/siroari）。機能一覧は `README.md`。

## アーキテクチャの要点

### 仕訳は保存しない・導出する

- DB に保存するのは `transactions` / `fixed_assets` / `invoices` / `partners` / `business_profile` だけ
- 仕訳・残高・決算書は `src/lib/ledger.ts` が毎回計算する。**仕訳テーブルを作って二重管理しないこと**
- 取引 → 仕訳のルール（`journalForTransaction`）
  - unpaid、または `paid_date > date` の売上は「売掛金」経由、経費は「未払金」経由の 2 仕訳
  - `business_ratio < 100` の経費は残りを事業主貸
  - wallet = card の経費は未払金、owner の経費は事業主借（`walletAccount`）
  - transfer は `from_code`（貸方）→ `account_code`（借方）
- 固定資産は取得仕訳・償却（12/31）・除却を `journalForAsset` が作る。**取得の支払いを取引でも登録すると二重計上**
- 期首残高: `profile.opening_balances[年]` が手入力値。無い年は前年から繰越（`carryForward`: 事業主貸・借・損益を元入金に吸収）
- ロジックを変えたら、テストデータで「貸借一致（`balanceSheet().diff === 0`）」を必ず確認する

### 勘定科目コードは DB に保存される

`src/lib/accounts.ts` のコードの意味を変えない（追加のみ可）。表示名の変更は OK。

### データの読み込み

`src/lib/data.tsx` の DataProvider がログイン後に全テーブルを読み込み、メモリで集計する。
Supabase は 1 リクエスト最大 1000 行なので `fetchAll` で range ページングしている（`.select()` 単発にしない）。

### 認証

- Supabase Auth（メール＋パスワード）。画面側は `AuthGate` が未ログインならログイン画面を出す
- RLS で `auth.uid() = user_id` の行のみ。insert 時の `user_id` は DB の default `auth.uid()` に任せている
- `/api/ai/*` は `requireUser`（`src/lib/serverAuth.ts`）で Bearer トークンを検証。クライアントは `useData().callApi` を使う

### AI（OpenRouter）

- モデル ID は `src/lib/openrouter.ts` の `MODELS`（2026-11 時点は全て `anthropic/claude-haiku-5.5`）。返答の JSON は `extractJson` で取り出す（json_object モードに依存しない）
- 領収書画像はクライアントで 1600px JPEG に縮小してから送る（Vercel のリクエスト上限 4.5MB）

## 過去に実際に踏んだ罠

- **日付が 1 日ずれる**（2026-11-26 設計時に回避）: `Date#toISOString()` は UTC。日本時間 0〜9 時に前日になる → 日付は必ず `src/lib/format.ts` の `today()` / `toDateStr()`（ローカル日付）を使う
- **OpenRouter のモデルが突然 404**（2026-11-26）: `google/gemini-2.0-flash-001` / `anthropic/claude-3.5-haiku` が廃止されていた → `https://openrouter.ai/api/v1/models` で現行 ID を確認して `MODELS` を更新
- **Supabase が NXDOMAIN / 接続できない**（2026-11-26）: 無料プランは 7 日間アクセスが無いと一時停止 → Dashboard から Resume（数分で復帰）
- **GitHub Actions のデプロイが invalidToken で失敗**（2026-11-26）: Secrets の `VERCEL_TOKEN` が失効 → Actions デプロイは廃止し、Vercel の Git 連携（push で自動デプロイ）に切り替えた
- **React 19 の lint**: effect 内の同期 setState は `react-hooks/set-state-in-effect`、render 中の `Date.now()` は `react-hooks/purity`、render 中の変数再代入は `react-hooks/immutability` で落ちる → `queueMicrotask` / `useState(() => ...)` / reduce で回避
- **`gh secret set --body -`** は "-" という文字列を保存する（2026-05）→ `--body '値'` で渡す
- **page.tsx から定数を export しない**: App Router の page は default 等の決まった export 以外を置くとビルドで落ちうる → 共有定数は `src/lib` に置く

## デプロイ

- Vercel プロジェクト `higashiyama-kaikei`（GitHub 連携。main への push で自動デプロイ）
- 本番: https://higashiyama-kaikei.vercel.app
- 環境変数: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `OPENROUTER_API_KEY`
- DB スキーマ: `supabase/schema.sql`（冪等。SQL Editor に貼って実行）
