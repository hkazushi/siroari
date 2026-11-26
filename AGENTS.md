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

# madorich（害虫駆除 現場マップ）

東山メンテナンス専用。タブレット・スマホ・PC で現場の見取り図を描き、害虫発見ポイントや施工内容を記録するアプリ。
機能の一覧は `README.md` を参照。ここには**実装時に気をつけること**を書く。

## アーキテクチャの要点

### ローカル優先（オフラインファースト）

保存はまず **IndexedDB（Dexie）** に行い、`src/lib/sync.ts` が Supabase と同期する。
オフラインでも動くことが前提の現場アプリなので、**この順序を崩さないこと**。
Supabase に直接書いて IndexedDB を経由しない実装をすると、電波の無い現場でデータが消える。

### 命名規則が層で変わる

| 層 | 形式 | 例 |
|---|---|---|
| アプリ内の型（`src/types`） | camelCase | `contactPerson` |
| Supabase のテーブル | snake_case | `contact_person` |

`sync.ts` の Row 型が変換を担っている。
**カラムを追加したら、型・Row 型・変換処理の3か所すべてを直す**こと。1つでも漏れると、その項目だけ静かに同期されない。

### 描画は React Konva + Zustand

- 図形の状態は `src/lib/store.ts`（Zustand）が持つ
- Undo / Redo は履歴スタックで実装済み。**図形を変更する処理は必ず store のアクション経由で行う**。Konva のノードを直接いじると履歴に乗らず、Undo が壊れる
- グリッドは 910mm（半間）スナップ + 直角自動補正

### 入力デバイス

マウス / タッチ / Apple Pencil を統一的に扱う。ポインタ処理を変更するときは **iPad でのペン入力**を必ず考慮する。

## デプロイ

- Vercel（GitHub push で自動デプロイ / `.github/workflows/deploy.yml`）
- 本番: https://gaicyu-madori.vercel.app
- リポジトリ: hkazushi/gaicyu-madori

## 注意

- `src/lib/openrouter.ts` / `src/hooks/useVoiceInput.ts` で AI・音声入力を使用。API キーは `.env.local` 管理
- PDF 出力（jsPDF）は日本語フォントの扱いに注意。文字化けを見つけたらフォント埋め込みを疑う
