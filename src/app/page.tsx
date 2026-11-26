"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle, CalendarClock, ChevronRight, Plus } from "lucide-react";
import { MORE_LINKS } from "@/components/AppShell";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ReceiptImporter } from "@/components/Receipt";
import { useTxDialog } from "@/components/TransactionDialog";
import { Badge, Button, Card, Empty, PageHeader, Stat, YearSelect } from "@/components/ui";
import { accountName } from "@/lib/accounts";
import { useData } from "@/lib/data";
import { shortDate, today, yearOf, yen } from "@/lib/format";
import { useBooks } from "@/lib/useBooks";
import { useYear } from "@/lib/year";

export default function Dashboard() {
  const { year, setYear, years } = useYear();
  const { profile, transactions } = useData();
  const { pl, months, tax } = useBooks(year);
  const { openNew, openEdit } = useTxDialog();

  const unpaidIncome = useMemo(
    () => transactions.filter((t) => t.kind === "income" && t.status === "unpaid"),
    [transactions],
  );
  const unpaidExpense = useMemo(
    () => transactions.filter((t) => t.kind === "expense" && t.status === "unpaid"),
    [transactions],
  );
  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, 6),
    [transactions],
  );
  const yearTxCount = transactions.filter((t) => yearOf(t.date) === year).length;

  const topExpenses = pl.expenses
    .filter((e) => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const maxExp = topExpenses[0]?.amount ?? 1;

  const needsSetup = !profile.owner_name;
  const deadline = `${year + 1}-03-15`;
  const daysLeft = Math.ceil(
    (new Date(`${deadline}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86400000,
  );

  return (
    <div>
      <PageHeader
        title={`${year}年の状況`}
        description={`${profile.trade_name} ／ 青色申告`}
        actions={
          <>
            <YearSelect value={year} onChange={setYear} years={years} />
            <Button onClick={() => openNew()} className="hidden sm:inline-flex">
              <Plus size={16} /> 取引を登録
            </Button>
          </>
        }
      />

      {needsSetup && (
        <Link
          href="/settings"
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span className="flex-1">
            はじめに「設定」で事業者情報（氏名・住所・インボイス登録番号・期首残高）を入力してください。
          </span>
          <ChevronRight size={16} />
        </Link>
      )}

      <ReceiptImporter className="mb-4" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="売上" value={yen(pl.revenueTotal)} sub={`取引 ${yearTxCount} 件`} />
        <Stat label="経費" value={yen(pl.expenseTotal + pl.cogs)} sub="減価償却費を含む" />
        <Stat
          label="所得（青色控除前）"
          value={yen(pl.incomeBeforeDeduction)}
          tone={pl.incomeBeforeDeduction < 0 ? "bad" : "default"}
          sub={`青色控除後 ${yen(pl.income)}`}
        />
        <Stat
          label="未入金の売上"
          value={yen(unpaidIncome.reduce((s, t) => s + t.amount, 0))}
          sub={`${unpaidIncome.length} 件`}
          tone={unpaidIncome.length ? "bad" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold">月別の売上・経費</h2>
            <Link href="/reports" className="text-xs text-[#1e3a5f] hover:underline">
              決算・帳簿へ
            </Link>
          </div>
          <MonthlyChart data={months} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-bold">経費の内訳</h2>
          {topExpenses.length === 0 ? (
            <Empty>まだ経費がありません</Empty>
          ) : (
            <ul className="space-y-2.5">
              {topExpenses.map((e) => (
                <li key={e.code}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700">{e.name}</span>
                    <span className="tabular-nums text-slate-900">{yen(e.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${(e.amount / maxExp) * 100}%`, background: "#eb6834" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold">最近登録した取引</h2>
            <Link href="/transactions" className="text-xs text-[#1e3a5f] hover:underline">
              すべて見る
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty>
              取引がまだありません。
              <br />
              上の枠に領収書の画像や PDF を入れると、自動で経費が登録されます。
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((t) => (
                <li key={t.id}>
                  <button
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => openEdit(t)}
                  >
                    <span className="w-10 text-xs text-slate-500 tabular-nums">{shortDate(t.date)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t.partner_name || t.memo || accountName(t.account_code)}</span>
                      <span className="block text-[11px] text-slate-500">{accountName(t.account_code)}</span>
                    </span>
                    <span
                      className={`text-sm font-medium tabular-nums ${t.kind === "income" ? "text-emerald-700" : "text-slate-900"}`}
                    >
                      {t.kind === "income" ? "+" : t.kind === "expense" ? "−" : ""}
                      {yen(t.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <CalendarClock size={16} /> 申告の期限
            </h2>
            <ul className="space-y-1.5 text-sm">
              <li className="flex justify-between">
                <span>{year}年分 確定申告</span>
                <span className="tabular-nums">
                  {year + 1}/3/15
                  {daysLeft >= 0 && daysLeft <= 120 && <Badge tone="amber">あと{daysLeft}日</Badge>}
                </span>
              </li>
              {profile.tax_status === "taxable" && (
                <li className="flex justify-between">
                  <span>消費税（目安 {yen(tax.total)}）</span>
                  <span className="tabular-nums">{year + 1}/3/31</span>
                </li>
              )}
            </ul>
            <Link href="/reports/blue-return" className="mt-3 block text-xs text-[#1e3a5f] hover:underline">
              青色申告決算書の資料を開く →
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-bold">支払・入金待ち</h2>
            {unpaidIncome.length + unpaidExpense.length === 0 ? (
              <p className="text-xs text-slate-500">ありません</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {[...unpaidIncome, ...unpaidExpense].slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <button className="flex w-full justify-between gap-2 text-left hover:underline" onClick={() => openEdit(t)}>
                      <span className="truncate">
                        <Badge tone={t.kind === "income" ? "amber" : "red"}>{t.kind === "income" ? "未入金" : "未払"}</Badge>{" "}
                        {t.partner_name || accountName(t.account_code)}
                      </span>
                      <span className="tabular-nums">{yen(t.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-2 md:hidden">
            {MORE_LINKS.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <n.icon size={18} className="text-[#1e3a5f]" />
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
