"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui";
import { useData } from "@/lib/data";
import { jpDate, num, yen } from "@/lib/format";
import { invoiceTotals, lineAmount } from "@/lib/invoice";

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const { invoices, profile, loading } = useData();
  const inv = invoices.find((i) => i.id === id);
  if (loading) return null;
  if (!inv) return <p className="p-8 text-center text-sm">請求書が見つかりません</p>;
  const t = invoiceTotals(inv.items);
  const hasReduced = inv.items.some((i) => i.tax_rate === 8);

  return (
    <div className="min-h-dvh bg-slate-100 py-4 print:bg-white print:py-0">
      <div className="mx-auto mb-3 flex max-w-[210mm] items-center justify-between px-4 print:hidden">
        <Link href={`/invoices/${inv.id}`} className="inline-flex items-center gap-1 text-sm text-slate-600">
          <ArrowLeft size={14} /> 編集に戻る
        </Link>
        <Button onClick={() => window.print()}>
          <Printer size={15} /> 印刷 / PDF に保存
        </Button>
      </div>

      <div className="print-sheet mx-auto max-w-[210mm] bg-white p-[14mm] text-[12px] leading-relaxed text-slate-900 shadow">
        <div className="flex items-start justify-between">
          <h1 className="text-[26px] font-bold tracking-[0.5em]">請求書</h1>
          <div className="text-right text-[11px]">
            <div>請求書番号: {inv.number}</div>
            <div>発行日: {jpDate(inv.issue_date)}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="border-b border-slate-800 pb-1 text-[18px] font-bold">{inv.partner_name || "　　　　"} 様</div>
            {inv.partner_address && <div className="mt-1 text-[11px]">{inv.partner_address}</div>}
            <p className="mt-4">下記のとおりご請求申し上げます。</p>
            {inv.subject && <p className="mt-1">件名: {inv.subject}</p>}
            <div className="mt-3 inline-flex items-end gap-4 border-b-2 border-slate-800 pb-1">
              <span className="text-[13px]">ご請求金額（税込）</span>
              <span className="text-[24px] font-bold tabular-nums">{yen(t.total)}</span>
            </div>
            {inv.due_date && <p className="mt-2">お支払期限: {jpDate(inv.due_date)}</p>}
          </div>
          <div className="w-[70mm] shrink-0 text-[11px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="mb-1 h-12 w-12 object-contain" />
            <div className="text-[14px] font-bold">{profile.trade_name}</div>
            {profile.owner_name && <div>{profile.owner_name}</div>}
            {profile.address && <div>{profile.address}</div>}
            {profile.phone && <div>TEL {profile.phone}</div>}
            {profile.email && <div>{profile.email}</div>}
            {profile.invoice_number && <div className="mt-1 font-medium">登録番号: {profile.invoice_number}</div>}
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-1 text-left">品名・作業内容</th>
              <th className="w-14 border border-slate-400 px-2 py-1">数量</th>
              <th className="w-10 border border-slate-400 px-2 py-1">単位</th>
              <th className="w-24 border border-slate-400 px-2 py-1">単価</th>
              <th className="w-12 border border-slate-400 px-2 py-1">税率</th>
              <th className="w-28 border border-slate-400 px-2 py-1">金額（税抜）</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-slate-400 px-2 py-1">
                  {it.description}
                  {it.tax_rate === 8 && " ※"}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">{it.quantity}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{it.unit}</td>
                <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">{num(it.unit_price)}</td>
                <td className="border border-slate-400 px-2 py-1 text-center">{it.tax_rate}%</td>
                <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">{num(lineAmount(it))}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 8 - inv.items.length) }, (_, i) => (
              <tr key={`blank-${i}`}>
                {Array.from({ length: 6 }, (_, j) => (
                  <td key={j} className="h-6 border border-slate-400" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <table className="w-[90mm] border-collapse text-[11px]">
            <tbody>
              {t.byRate.map((r) => (
                <tr key={r.rate}>
                  <th className="border border-slate-400 bg-slate-50 px-2 py-1 text-left font-normal">
                    {r.rate === 0 ? "対象外" : `${r.rate}%対象`}
                    {r.rate === 8 && "（軽減税率）"}
                  </th>
                  <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">{yen(r.subtotal)}</td>
                  <td className="border border-slate-400 px-2 py-1 text-right tabular-nums">
                    {r.rate === 0 ? "—" : `消費税 ${yen(r.tax)}`}
                  </td>
                </tr>
              ))}
              <tr>
                <th className="border border-slate-400 bg-slate-100 px-2 py-1 text-left">合計</th>
                <td colSpan={2} className="border border-slate-400 px-2 py-1 text-right text-[13px] font-bold tabular-nums">
                  {yen(t.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {hasReduced && <p className="mt-1 text-right text-[10px]">※ は軽減税率（8%）対象</p>}

        {profile.bank_info && (
          <div className="mt-5">
            <div className="font-bold">お振込先</div>
            <div className="whitespace-pre-wrap">{profile.bank_info}</div>
            <div className="text-[10px] text-slate-600">※ 振込手数料はご負担くださいますようお願いいたします。</div>
          </div>
        )}
        {inv.notes && (
          <div className="mt-4">
            <div className="font-bold">備考</div>
            <div className="whitespace-pre-wrap">{inv.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
