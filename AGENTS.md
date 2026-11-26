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

- ログイン画面は **4桁の番号（PIN）だけ**。メールでのログイン画面は無い（2026-11-26 ユーザー判断: 固定の番号で開ければよい）
- 照合は `/api/auth/pin`（サーバー）だけ。合っていればサーバーが内部ユーザー（`OWNER_EMAIL`、パスワードは `LOGIN_PASSWORD`）で Supabase にログインしてセッションを返す（クライアントは `setSession`）。内部ユーザーが無ければ初回だけ自動作成（Supabase の Confirm email がオフのときのみ）
- **リポジトリは PUBLIC**。PIN・パスワードをコードに書かない（環境変数のみ）
- `/api/ai/*` は内部ユーザー以外を 403 にする（新規登録が開いていても AI を使われないように）
- 総当たり対策: `login_guard` テーブル＋ `pin_guard_*` 関数（schema.sql の 9）。5 回失敗でロック、ロック時間は倍々で最長 24 時間。リセット関数は authenticated のみ実行可（anon からは revoke 済み）
- 画面側は `AuthGate` が未ログインならログイン画面を出す
- RLS で `auth.uid() = user_id` の行のみ。insert 時の `user_id` は DB の default `auth.uid()` に任せている
- `/api/ai/*` は `requireUser`（`src/lib/serverAuth.ts`）で Bearer トークンを検証。クライアントは `useData().callApi` を使う

### AI（OpenRouter）

- モデル ID は `src/lib/openrouter.ts` の `MODELS`（2026-11 時点は全て `anthropic/claude-haiku-5.5`）。返答の JSON は `extractJson` で取り出す（json_object モードに依存しない）
- 領収書の自動登録（`ReceiptImporter`）: ファイル（画像は 2000px JPEG に縮小、PDF はそのまま）を **先に Storage の receipts に保存** → `/api/ai/receipt` にパスだけ送る → サーバーが本人の権限でダウンロードして AI へ（画像は image_url、PDF は type:"file"）→ 返ってきた entries ごとに取引を作り `receipt_path` でひも付け。本文に画像を載せないのは Vercel のリクエスト上限 4.5MB のため
- AI 相談（チャット）は 2026-11-26 に削除した（ユーザー判断: 不要）

### イメージキャラ（サビ猫）

- 絵は `src/lib/catArt.ts` がコードで生成する（実在の飼い猫がモデル。額の黒い縦筋・向かって右のオレンジ・口元の左右の色の違いを崩さない）
- 柄は図形で区切らず「黒さの場（`headDark` / `bodyMix`）＋ノイズ」で決める。図形で塗ると黒い部分が貼り付けたように分かれて見える（2026-11-26 にユーザー指摘）
- 名前は「あかちゃん」（`CAT_NAME`）。ひとことに語尾「にゃ」は付けない。常に表示（表示オン・オフの設定は不要とのことで削除）（ユーザー指定）
- 画面用は `src/components/Cat.tsx`（`CatHead` / `CatSitting` / 歩く `CatWalking` / 背景の `BackgroundCat`）。背景では座る→歩く→座るを繰り返す。歩く姿は顔だけ正面の `/cat-head.svg` を重ね、左向きでも顔は反転しない（柄が逆になるため）。アニメーションは `globals.css` の `.cat-live` 配下
- `CatSitting` は `public/cat-layer-{tail,body,head}.svg` を `<img>` で重ね、目だけインライン SVG。しっぽ・首は CSS transform で動かす
- アイコン・レイヤー類（`public/cat-*.svg`・`cat-icon-*.png`・`apple-touch-icon.png`・`favicon-32.png`）は生成物。`catArt.ts` を変えたら `node scripts/gen-cat-icons.mjs` を実行（rsvg-convert が必要）
- `catArt.ts` は import を持たない（Node が直接 .ts を読むため）
- 請求書の印刷には会社ロゴ（`public/logo.png`）を使う。猫は出さない

## 過去に実際に踏んだ罠

- **日付が 1 日ずれる**（2026-11-26 設計時に回避）: `Date#toISOString()` は UTC。日本時間 0〜9 時に前日になる → 日付は必ず `src/lib/format.ts` の `today()` / `toDateStr()`（ローカル日付）を使う
- **OpenRouter のモデルが突然 404**（2026-11-26）: `google/gemini-2.0-flash-001` / `anthropic/claude-3.5-haiku` が廃止されていた → `https://openrouter.ai/api/v1/models` で現行 ID を確認して `MODELS` を更新
- **Supabase が NXDOMAIN / 接続できない**（2026-11-26）: 無料プランは 7 日間アクセスが無いと一時停止 → Dashboard から Resume（数分で復帰）
- **GitHub Actions のデプロイが invalidToken で失敗**（2026-11-26）: Secrets の `VERCEL_TOKEN` が失効 → Actions デプロイは廃止し、Vercel の Git 連携（push で自動デプロイ）に切り替えた
- **React 19 の lint**: effect 内の同期 setState は `react-hooks/set-state-in-effect`、render 中の `Date.now()` は `react-hooks/purity`、render 中の変数再代入は `react-hooks/immutability` で落ちる → `queueMicrotask` / `useState(() => ...)` / reduce で回避
- **SQL で作った関数が anon から実行できてしまう**（2026-11-26）: Supabase は public スキーマの関数に anon/authenticated の EXECUTE を既定で付ける。`revoke ... from public` だけでは外れない → `revoke execute on function ... from anon;` を明示する。作成後に anon キーで `/rest/v1/rpc/<関数>` を叩いて 401/403 になることを確認
- **`gh secret set --body -`** は "-" という文字列を保存する（2026-05）→ `--body '値'` で渡す
- **毛並みの多いインライン SVG を CSS アニメで動かすと重い**（2026-11-26）: 数千本の path＋ぼかしを毎フレーム再描画し、背景の猫だけで 60fps → 32fps に落ちた → 動かない部分は画像（`<img>`）にして transform で動かす。変更後は rAF で fps を計測して確認する
- **dev サーバーが古い globals.css を返し続ける**（2026-11-26）: 再起動しても直らなかった → `.next` を削除してから起動し直す
- **ダイアログがあかちゃん（z-20）の下に隠れた**（2026-11-26）: `main` の `relative z-10` が重なり順の文脈を作り、その中の z-50 も外では z-10 扱いになる → `Modal` は `createPortal` で body 直下に出す。fixed 要素を足すときは z の階層（あかちゃん 20 / ヘッダー 30 / ダイアログ 50）を守る
- **page.tsx から定数を export しない**: App Router の page は default 等の決まった export 以外を置くとビルドで落ちうる → 共有定数は `src/lib` に置く

## デプロイ

- Vercel プロジェクト `gaicyu-madori`（旧アプリのものを再利用。GitHub 連携で main への push が自動デプロイ）
- 本番: https://gaicyu-madori.vercel.app（Vercel プロジェクト gaicyu-madori をそのまま使用）
- 環境変数: `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `OPENROUTER_API_KEY` / `LOGIN_PIN` / `LOGIN_PASSWORD`（`LOGIN_EMAIL` は任意。省略時 `owner@higashiyama-kaikei.example.com`）
- DB スキーマ: `supabase/schema.sql`（冪等。SQL Editor に貼って実行）
