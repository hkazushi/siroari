// Server-side only — 取引読み取り用の共通プロンプト
import { EXPENSE_ACCOUNTS, REVENUE_ACCOUNTS } from "./accounts";

export function accountListForPrompt(): string {
  const fmt = (a: { code: string; name: string; hint?: string }) =>
    `${a.code}: ${a.name}${a.hint ? `（${a.hint}）` : ""}`;
  return [
    "【売上科目】",
    ...REVENUE_ACCOUNTS.map(fmt),
    "【経費科目】",
    ...EXPENSE_ACCOUNTS.map(fmt),
  ].join("\n");
}

export const ENTRY_JSON_SPEC = `次の JSON だけを返す（説明文は不要）:
{
  "kind": "expense" | "income",
  "date": "YYYY-MM-DD",
  "amount": 税込合計金額（整数・円）,
  "account_code": 上の一覧のコード,
  "tax_rate": 10 | 8 | 0,
  "partner_name": "店名・支払先・お客様名",
  "memo": "品名や用途を短く",
  "wallet": "cash" | "bank" | "card" | "owner",
  "invoice_number": "T から始まる13桁の登録番号（あれば）"
}
- 事業者は個人の害虫駆除業（シロアリ・ゴキブリ・ネズミ・ハチ駆除など）。
- 殺虫剤・防蟻剤・ベイト剤・粘着トラップなど施工で使う資材は 6310（薬剤・材料費）。
- ガソリン・車検・オイル交換は 6300（車両費）、高速代・駐車場は 6130（旅費交通費）。
- 10万円未満の道具・作業着は 6190（消耗品費）。
- 食料品（酒類・外食を除く）の 8% 軽減税率に注意。8% と 10% が混在するレシートは金額が大きい方の税率を入れ、memo に「8%混在」と書く。
- 印紙・税金・保険料・給料・利息は tax_rate 0。
- 支払方法が不明なら "cash"。年が不明なら今日の日付の年を使う。分からない項目は省略してよい。`;
