import type { Wallet } from "./accounts";

export type TxKind = "income" | "expense" | "transfer";
export type TaxRate = 0 | 8 | 10;

export interface Transaction {
  id: string;
  kind: TxKind;
  /** YYYY-MM-DD（ローカル日付） */
  date: string;
  /** 税込金額（円・整数） */
  amount: number;
  /** income/expense: 売上・経費科目 / transfer: 借方（行き先） */
  account_code: string;
  /** transfer のみ: 貸方（出どころ） */
  from_code: string | null;
  wallet: Wallet;
  status: "paid" | "unpaid";
  paid_date: string | null;
  tax_rate: TaxRate;
  partner_id: string | null;
  partner_name: string;
  memo: string;
  receipt_path: string | null;
  invoice_id: string | null;
  /** 事業利用割合（%）。100 未満なら残りは事業主貸 */
  business_ratio: number;
  created_at?: string;
  updated_at?: string;
}

export type TransactionInput = Omit<Transaction, "id" | "created_at" | "updated_at">;

export interface Partner {
  id: string;
  name: string;
  kana: string;
  address: string;
  phone: string;
  email: string;
  notes: string;
  created_at?: string;
}

export type PartnerInput = Omit<Partner, "id" | "created_at">;

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  /** 税抜単価 */
  unit_price: number;
  tax_rate: TaxRate;
}

export interface Invoice {
  id: string;
  number: string;
  subject: string;
  partner_id: string | null;
  partner_name: string;
  partner_address: string;
  issue_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  notes: string;
  status: "draft" | "issued" | "paid";
  paid_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InvoiceInput = Omit<Invoice, "id" | "created_at" | "updated_at">;

export type DepMethod = "straight" | "lump_sum_3y" | "small_amount";

export interface FixedAsset {
  id: string;
  name: string;
  account_code: string;
  acquired_date: string;
  cost: number;
  useful_life: number;
  method: DepMethod;
  business_ratio: number;
  paid_from: Wallet;
  disposed_date: string | null;
  notes: string;
  created_at?: string;
}

export type FixedAssetInput = Omit<FixedAsset, "id" | "created_at">;

export type TaxStatus = "exempt" | "taxable";
export type TaxMethod = "general" | "simplified" | "twenty_percent";

export interface BusinessProfile {
  trade_name: string;
  owner_name: string;
  address: string;
  phone: string;
  email: string;
  invoice_number: string;
  bank_info: string;
  tax_status: TaxStatus;
  tax_method: TaxMethod;
  simplified_category: number;
  blue_deduction: number;
  /** { "2026": { "1110": 500000 } } 年初の残高（ユーザー入力） */
  opening_balances: Record<string, Record<string, number>>;
}

export const DEFAULT_PROFILE: BusinessProfile = {
  trade_name: "東山メンテナンス",
  owner_name: "",
  address: "",
  phone: "",
  email: "",
  invoice_number: "",
  bank_info: "",
  tax_status: "exempt",
  tax_method: "twenty_percent",
  simplified_category: 5,
  blue_deduction: 650000,
  opening_balances: {},
};
