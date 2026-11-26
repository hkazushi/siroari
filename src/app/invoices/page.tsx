"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, Empty, PageHeader, Segmented, YearSelect } from "@/components/ui";
import { useData } from "@/lib/data";
import { endOfNextMonth, jpDate, today, yearOf, yen } from "@/lib/format";
import { INVOICE_STATUS, invoiceTotals, nextInvoiceNumber } from "@/lib/invoice";
import type { Invoice } from "@/lib/types";
import { useYear } from "@/lib/year";

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, addInvoice } = useData();
  const { year, setYear, years } = useYear();
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () =>
      invoices
        .filter((i) => yearOf(i.issue_date) === year)
        .filter((i) => filter === "all" || i.status === filter)
        .sort((a, b) => (a.issue_date < b.issue_date ? 1 : a.issue_date > b.issue_date ? -1 : b.number.localeCompare(a.number))),
    [invoices, year, filter],
  );

  async function create() {
    setBusy(true);
    try {
      const d = today();
      const inv = await addInvoice({
        number: nextInvoiceNumber(invoices, d),
        subject: "",
        partner_id: null,
        partner_name: "",
        partner_address: "",
        issue_date: d,
        due_date: endOfNextMonth(d),
        items: [{ description: "", quantity: 1, unit: "式", unit_price: 0, tax_rate: 10 }],
        notes: "",
        status: "draft",
        paid_date: null,
      });
      router.push(`/invoices/${inv.id}`);
    } catch (e) {
      alert(`作成できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="請求書"
        description="適格請求書（インボイス）の要件を満たす請求書を作成・印刷。発行すると売上（売掛金）に自動登録されます"
        actions={
          <Button onClick={create} disabled={busy}>
            <Plus size={16} /> 新しい請求書
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <YearSelect value={year} onChange={setYear} years={years} />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "すべて" },
            { value: "draft", label: "下書き" },
            { value: "issued", label: "未入金" },
            { value: "paid", label: "入金済" },
          ]}
        />
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty>請求書がありません</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((i) => {
              const t = invoiceTotals(i.items);
              const st = INVOICE_STATUS[i.status];
              return (
                <li key={i.id}>
                  <Link href={`/invoices/${i.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {i.partner_name || "（宛先未入力）"} {i.subject && <span className="text-slate-500">／ {i.subject}</span>}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        No.{i.number} ・ {jpDate(i.issue_date)}
                        {i.due_date && ` ・ 支払期限 ${jpDate(i.due_date)}`}
                      </span>
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                    <span className="w-24 text-right text-sm font-medium tabular-nums">{yen(t.total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
