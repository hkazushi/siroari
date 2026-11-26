import type { Invoice, InvoiceItem, Transaction, TransactionInput } from "./types";

export interface InvoiceTotals {
  /** 税率ごとの税抜合計・消費税（適格請求書は税率ごとに 1 回だけ端数処理） */
  byRate: { rate: number; subtotal: number; tax: number }[];
  subtotal: number;
  tax: number;
  total: number;
}

export function lineAmount(it: InvoiceItem): number {
  return Math.round((Number(it.quantity) || 0) * (Number(it.unit_price) || 0));
}

export function invoiceTotals(items: InvoiceItem[]): InvoiceTotals {
  const map = new Map<number, number>();
  for (const it of items) map.set(it.tax_rate, (map.get(it.tax_rate) ?? 0) + lineAmount(it));
  const byRate = [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, subtotal]) => ({ rate, subtotal, tax: Math.floor((subtotal * rate) / 100) }));
  const subtotal = byRate.reduce((s, r) => s + r.subtotal, 0);
  const tax = byRate.reduce((s, r) => s + r.tax, 0);
  return { byRate, subtotal, tax, total: subtotal + tax };
}

/** 次の請求書番号（YYYYMM-001 形式） */
export function nextInvoiceNumber(invoices: Invoice[], issueDate: string): string {
  const prefix = issueDate.slice(0, 7).replace("-", "");
  let max = 0;
  for (const i of invoices) {
    const m = i.number.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/** 請求書に対応する売上取引のデータ（税率が混在する場合は大きい方の税率で 1 件にまとめる） */
export function salesFromInvoice(inv: Invoice, existing?: Transaction): TransactionInput {
  const t = invoiceTotals(inv.items);
  const main = [...t.byRate].sort((a, b) => b.subtotal - a.subtotal)[0];
  const paid = inv.status === "paid";
  return {
    kind: "income",
    date: inv.issue_date,
    amount: t.total,
    account_code: existing?.account_code ?? "4100",
    from_code: null,
    wallet: existing?.wallet ?? "bank",
    status: paid ? "paid" : "unpaid",
    paid_date: paid ? (inv.paid_date ?? inv.issue_date) : null,
    tax_rate: (main?.rate ?? 10) as TransactionInput["tax_rate"],
    partner_id: inv.partner_id,
    partner_name: inv.partner_name,
    memo: `請求書 ${inv.number}${inv.subject ? ` ${inv.subject}` : ""}`,
    receipt_path: existing?.receipt_path ?? null,
    invoice_id: inv.id,
    business_ratio: 100,
  };
}

export const INVOICE_STATUS: Record<Invoice["status"], { label: string; tone: "slate" | "amber" | "green" }> = {
  draft: { label: "下書き", tone: "slate" },
  issued: { label: "請求済（未入金）", tone: "amber" },
  paid: { label: "入金済", tone: "green" },
};
