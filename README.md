# 会計アプリ（東山メンテナンス）

東山メンテナンス（害虫駆除業・個人事業）専用の **青色申告用 会計アプリ**。
freee / マネーフォワード / 弥生 の代わりに、日々の取引入力から確定申告用の決算書資料までを 1 つで行う。

- 本番: https://higashiyama-kaikei.vercel.app
- リポジトリ: https://github.com/hkazushi/siroari（旧アプリ「害虫駆除 現場マップ」は タグ `v1-madorich`）

イメージキャラは **サビ猫**（ロゴ・アプリアイコン・ログイン画面、画面右下に座っていてタップすると経理のひとこと）。

## 主な機能

| 画面 | できること |
|---|---|
| ホーム | 売上・経費・所得・未入金の集計、月別グラフ、経費内訳、申告期限 |
| 取引 | 売上・経費・振替の登録／検索／CSV。**領収書を撮影 → AI が読み取り**、**音声・文章で入力 → AI が科目を判定**、家事按分、未入金・未払の管理 |
| 請求書 | 適格請求書（インボイス）形式で作成・印刷・PDF。発行すると売上（売掛金）に自動登録、入金済で預金へ振替 |
| 決算・帳簿 | 損益計算書・貸借対照表・月次推移・仕訳帳・総勘定元帳・消費税の概算（一般／簡易／2割特例）、各 CSV |
| 青色申告決算書の資料 | 決算書 1〜4 ページ分の数字を A4 で印刷（作成コーナーへ転記用） |
| 固定資産 | 定額法（月割・備忘価額 1 円）、一括償却資産（3 年）、少額減価償却資産の特例。12/31 に自動で償却仕訳 |
| 取引先 | 請求書の宛先・入力候補・取引先別の売上と未入金 |
| AI 相談 | 帳簿の数字をもとに経理・税金の質問に回答 |
| 設定 | 事業者情報、インボイス登録番号、消費税の方式、青色控除額、期首残高、全データのバックアップ |

## 仕組み

- 取引（`transactions`）と固定資産（`fixed_assets`）だけを保存し、**複式簿記の仕訳はアプリが毎回導出**する（`src/lib/ledger.ts`）
- 期首残高は「設定」で入力した年から、翌年以降は自動で繰越（事業主貸・借と所得は元入金へ）
- 税込経理。消費税は割戻し計算の概算

## 技術スタック

Next.js 16（App Router）/ React 19 / Tailwind CSS v4 / Supabase（Auth・Postgres・Storage）/ OpenRouter（Claude Haiku 5.5）/ Vercel

## セットアップ

1. Supabase の SQL Editor で `supabase/schema.sql` を実行
2. Supabase → Authentication → Users → Add user（Auto Confirm）でログイン用ユーザーを作成し、Sign In / Providers で新規登録（Allow new users to sign up）を OFF
3. `.env.local`（Vercel の Environment Variables も同じ）

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # sb_publishable_...
OPENROUTER_API_KEY=...
```

4. `npm install && npm run dev`

## 注意

- 申告書そのものは国税庁「確定申告書等作成コーナー」で作成する。このアプリは帳簿と転記用の資料まで
- 税制（2割特例は 2026 年分まで 等）は年ごとに確認すること
