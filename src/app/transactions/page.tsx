"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { ReceiptImporter, ReceiptThumb } from "@/components/Receipt";
import { useTxDialog } from "@/components/TransactionDialog";
import { Badge, Button, Card, Empty, Input, PageHeader, Select, YearSelect } from "@/components/ui";
import { ACCOUNTS, accountName, walletLabel } from "@/lib/accounts";
import { downloadCsv } from "@/lib/csv";
import { useData } from "@/lib/data";
import { monthOf, shortDate, today, yearOf, yen } from "@/lib/format";
import type { Transaction, TxKind } from "@/lib/types";
import { useYear } from "@/lib/year";

const KIND_LABEL: Record<TxKind, string> = { income: "売上", expense: "経費", transfer: "振替" };

export default function TransactionsPage() {
  const { transactions, updateTransaction } = useData();
  const { year, setYear, years } = useYear();
  const { openNew, openEdit } = useTxDialog();
  const [month, setMonth] = useState(0);
  const [kind, setKind] = useState<"" | TxKind>("");
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return transactions
      .filter((t) => yearOf(t.date) === year)
      .filter((t) => !month || monthOf(t.date) === month)
      .filter((t) => !kind || t.kind === kind)
      .filter((t) => !code || t.account_code === code || t.from_code === code)
      .filter((t) => !unpaidOnly || t.status === "unpaid")
      .filter(
        (t) =>
          !query ||
          `${t.partner_name} ${t.memo} ${accountName(t.account_code)} ${t.amount}`.toLowerCase().includes(query),
      )
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  }, [transactions, year, month, kind, code, q, unpaidOnly]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of list) {
      if (t.kind === "income") income += t.amount;
      if (t.kind === "expense") expense += Math.floor((t.amount * t.business_ratio) / 100);
    }
    return { income, expense };
  }, [list]);

  function exportCsv() {
    downloadCsv(`取引一覧_${year}${month ? `_${month}月` : ""}.csv`, [
      ["日付", "区分", "勘定科目", "振替元", "金額(税込)", "事業割合(%)", "税率(%)", "決済", "状況", "入出金日", "取引先", "メモ", "領収書"],
      ...list
        .slice()
        .reverse()
        .map((t) => [
          t.date,
          KIND_LABEL[t.kind],
          accountName(t.account_code),
          t.from_code ? accountName(t.from_code) : "",
          t.amount,
          t.business_ratio,
          t.tax_rate,
          t.kind === "transfer" ? "" : walletLabel(t.wallet),
          t.status === "paid" ? "済" : "未",
          t.paid_date ?? "",
          t.partner_name,
          t.memo,
          t.receipt_path ? "あり" : "",
        ]),
    ]);
  }

  async function markPaid(t: Transaction) {
    try {
      await updateTransaction(t.id, { status: "paid", paid_date: today() });
    } catch (e) {
      alert(`更新できませんでした: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 日付ごとにグループ化
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of list) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return [...m.entries()];
  }, [list]);

  return (
    <div>
      <PageHeader
        title="取引"
        description="売上・経費・振替を登録すると、仕訳・帳簿・決算書は自動で作られます"
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!list.length}>
              <Download size={15} /> CSV
            </Button>
            <Button onClick={() => openNew()}>
              <Plus size={16} /> 取引を登録
            </Button>
          </>
        }
      />

      <ReceiptImporter className="mb-3" />

      <Card className="mb-3 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <YearSelect value={year} onChange={setYear} years={years} />
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={0}>全月</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}月
              </option>
            ))}
          </Select>
          <Select value={kind} onChange={(e) => setKind(e.target.value as "" | TxKind)}>
            <option value="">すべての区分</option>
            <option value="income">売上</option>
            <option value="expense">経費</option>
            <option value="transfer">振替</option>
          </Select>
          <Select value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">すべての科目</option>
            {ACCOUNTS.filter((a) => a.code !== "3100" && a.code !== "6200").map((a) => (
              <option key={a.code} value={a.code}>
                {a.name}
              </option>
            ))}
          </Select>
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="検索" className="pl-8" />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-700 sm:col-span-1">
            <input type="checkbox" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
            未入金・未払のみ
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="text-slate-500">
            {list.length} 件
          </span>
          <span>
            売上 <b className="tabular-nums text-emerald-700">{yen(totals.income)}</b>
          </span>
          <span>
            経費（事業分） <b className="tabular-nums">{yen(totals.expense)}</b>
          </span>
        </div>
      </Card>

      <Card>
        {groups.length === 0 ? (
          <Empty>該当する取引がありません</Empty>
        ) : (
          groups.map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-14 z-10 border-y border-slate-100 bg-slate-50 px-4 py-1 text-xs font-medium text-slate-500 first:border-t-0">
                {shortDate(date)}（{"日月火水木金土"[new Date(`${date}T00:00:00`).getDay()]}）
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50">
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openEdit(t)}>
                      <Badge tone={t.kind === "income" ? "green" : t.kind === "expense" ? "slate" : "blue"}>
                        {KIND_LABEL[t.kind]}
                      </Badge>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {t.kind === "transfer"
                            ? `${accountName(t.from_code ?? "")} → ${accountName(t.account_code)}`
                            : t.partner_name || t.memo || accountName(t.account_code)}
                        </span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                          {t.kind !== "transfer" && <span>{accountName(t.account_code)}</span>}
                          {t.kind !== "transfer" && <span>{walletLabel(t.wallet)}</span>}
                          {t.business_ratio < 100 && <span>事業{t.business_ratio}%</span>}
                          {t.tax_rate === 8 && <span>軽減8%</span>}
                          {t.memo && t.partner_name && <span className="truncate">{t.memo}</span>}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-medium whitespace-nowrap tabular-nums ${t.kind === "income" ? "text-emerald-700" : ""}`}
                      >
                        {yen(t.amount)}
                      </span>
                    </button>
                    {t.receipt_path && <ReceiptThumb path={t.receipt_path} />}
                    {t.status === "unpaid" && (
                      <Button size="sm" variant="secondary" onClick={() => markPaid(t)} className="shrink-0">
                        {t.kind === "income" ? "入金済に" : "支払済に"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
