"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, Printer, Send, Trash2, X } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useData } from "@/lib/data";
import { parseAmount, today, yen } from "@/lib/format";
import { INVOICE_STATUS, invoiceTotals, lineAmount, salesFromInvoice } from "@/lib/invoice";
import type { Invoice, InvoiceInput, InvoiceItem, TaxRate } from "@/lib/types";
import { stripMeta } from "@/lib/utils";

export default function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>();
  const { invoices } = useData();
  const inv = invoices.find((i) => i.id === id);
  if (!inv) {
    return (
      <Card>
        <Empty>
          請求書が見つかりません。<Link href="/invoices" className="text-[#1e3a5f] underline">一覧へ戻る</Link>
        </Empty>
      </Card>
    );
  }
  return <Editor key={inv.id} inv={inv} />;
}

function Editor({ inv }: { inv: Invoice }) {
  const router = useRouter();
  const { partners, transactions, profile, updateInvoice, deleteInvoice, addTransaction, updateTransaction, deleteTransaction } =
    useData();
  const [form, setForm] = useState<InvoiceInput>(() => stripMeta(inv));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const linked = transactions.find((t) => t.invoice_id === inv.id);
  const totals = invoiceTotals(form.items);

  const set = <K extends keyof InvoiceInput>(k: K, v: InvoiceInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };
  const setItem = (i: number, patch: Partial<InvoiceItem>) =>
    set(
      "items",
      form.items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    );

  /** 保存し、発行済なら売上取引も同期 */
  async function persist(patch: Partial<InvoiceInput> = {}) {
    setBusy(true);
    try {
      const next = { ...form, ...patch, items: form.items.filter((it) => it.description || it.unit_price) };
      const saved = await updateInvoice(inv.id, next);
      setForm((f) => ({ ...f, ...patch }));
      setDirty(false);
      if (saved.status === "draft") {
        if (linked && confirm("下書きに戻しました。自動登録した売上取引も削除しますか？")) await deleteTransaction(linked.id);
      } else {
        const data = salesFromInvoice(saved, linked);
        if (data.amount <= 0) {
          alert("金額が 0 円のため売上には登録していません");
        } else if (linked) {
          await updateTransaction(linked.id, data);
        } else {
          await addTransaction(data);
        }
      }
      return saved;
    } catch (e) {
      alert(`保存できませんでした: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("この請求書を削除しますか？（元に戻せません）")) return;
    setBusy(true);
    try {
      if (linked && confirm("この請求書から登録した売上取引も削除しますか？")) await deleteTransaction(linked.id);
      await deleteInvoice(inv.id);
      router.push("/invoices");
    } catch (e) {
      alert(`削除できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  const st = INVOICE_STATUS[form.status];

  return (
    <div>
      <Link href="/invoices" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> 請求書一覧
      </Link>
      <PageHeader
        title={`請求書 No.${form.number}`}
        actions={
          <>
            <Badge tone={st.tone}>{st.label}</Badge>
            <Button
              variant="secondary"
              onClick={async () => {
                if (dirty) await persist();
                router.push(`/invoices/${inv.id}/print`);
              }}
            >
              <Printer size={15} /> 印刷・PDF
            </Button>
            <Button onClick={() => persist()} disabled={busy || !dirty}>
              {busy ? <Spinner /> : "保存"}
            </Button>
          </>
        }
      />

      {!profile.invoice_number && profile.tax_status === "taxable" && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          設定でインボイス登録番号（T＋13桁）を入力すると、請求書に印字されます。
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="宛先（取引先）">
              <Input
                list="inv-partners"
                value={form.partner_name}
                onChange={(e) => {
                  const p = partners.find((x) => x.name === e.target.value);
                  setForm((f) => ({
                    ...f,
                    partner_name: e.target.value,
                    partner_id: p?.id ?? null,
                    partner_address: p ? p.address : f.partner_address,
                  }));
                  setDirty(true);
                }}
                placeholder="〇〇 様"
              />
              <datalist id="inv-partners">
                {partners.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </Field>
            <Field label="件名">
              <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="例: シロアリ予防工事" />
            </Field>
          </div>
          <Field label="宛先住所">
            <Input value={form.partner_address} onChange={(e) => set("partner_address", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="請求書番号">
              <Input value={form.number} onChange={(e) => set("number", e.target.value)} />
            </Field>
            <Field label="発行日">
              <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
            </Field>
            <Field label="支払期限">
              <Input type="date" value={form.due_date ?? ""} onChange={(e) => set("due_date", e.target.value || null)} />
            </Field>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">明細（単価は税抜）</div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 rounded-lg bg-slate-50 p-2">
                  <Input
                    className="col-span-12 sm:col-span-5"
                    value={it.description}
                    onChange={(e) => setItem(i, { description: e.target.value })}
                    placeholder="品名・作業内容"
                  />
                  <Input
                    className="col-span-3 text-right sm:col-span-1"
                    inputMode="decimal"
                    value={String(it.quantity)}
                    onChange={(e) => setItem(i, { quantity: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })}
                  />
                  <Input
                    className="col-span-3 sm:col-span-1"
                    value={it.unit}
                    onChange={(e) => setItem(i, { unit: e.target.value })}
                    placeholder="式"
                  />
                  <Input
                    className="col-span-6 text-right sm:col-span-2"
                    inputMode="numeric"
                    value={it.unit_price ? String(it.unit_price) : ""}
                    onChange={(e) => setItem(i, { unit_price: parseAmount(e.target.value) })}
                    placeholder="単価"
                  />
                  <Select
                    className="col-span-5 sm:col-span-1 sm:px-1"
                    value={it.tax_rate}
                    onChange={(e) => setItem(i, { tax_rate: Number(e.target.value) as TaxRate })}
                  >
                    <option value={10}>10%</option>
                    <option value={8}>8%※</option>
                    <option value={0}>0%</option>
                  </Select>
                  <div className="col-span-5 flex items-center justify-end text-sm tabular-nums sm:col-span-1">
                    {yen(lineAmount(it))}
                  </div>
                  <button
                    className="col-span-2 flex items-center justify-center text-slate-400 hover:text-red-700 sm:col-span-1"
                    onClick={() =>
                      set(
                        "items",
                        form.items.filter((_, j) => j !== i),
                      )
                    }
                    aria-label="明細を削除"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => set("items", [...form.items, { description: "", quantity: 1, unit: "式", unit_price: 0, tax_rate: 10 }])}
            >
              <Plus size={14} /> 明細を追加
            </Button>
          </div>
          <Field label="備考">
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="例: 保証期間 5 年" />
          </Field>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <dl className="space-y-1.5 text-sm">
              {totals.byRate.map((r) => (
                <div key={r.rate} className="flex justify-between text-slate-600">
                  <dt>
                    {r.rate}%対象 {yen(r.subtotal)}
                  </dt>
                  <dd className="tabular-nums">税 {yen(r.tax)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                <dt>ご請求金額</dt>
                <dd className="tabular-nums">{yen(totals.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="space-y-2 p-4">
            {form.status === "draft" && (
              <Button className="w-full" onClick={() => persist({ status: "issued" })} disabled={busy || totals.total <= 0}>
                <Send size={15} /> 発行する（売上に登録）
              </Button>
            )}
            {form.status === "issued" && (
              <>
                <Field label="入金日">
                  <Input type="date" value={form.paid_date ?? today()} onChange={(e) => set("paid_date", e.target.value)} />
                </Field>
                <Button
                  className="w-full"
                  onClick={() => persist({ status: "paid", paid_date: form.paid_date ?? today() })}
                  disabled={busy}
                >
                  <CheckCircle2 size={15} /> 入金済にする
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => persist({ status: "draft" })} disabled={busy}>
                  下書きに戻す
                </Button>
              </>
            )}
            {form.status === "paid" && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => persist({ status: "issued", paid_date: null })}
                disabled={busy}
              >
                未入金に戻す
              </Button>
            )}
            <p className="text-[11px] leading-relaxed text-slate-500">
              {linked
                ? `売上取引に登録済み（${linked.status === "paid" ? "入金済" : "売掛金"}）。請求書を保存すると取引も更新されます。`
                : "発行すると、発行日付で売上（売掛金）が登録されます。入金済にすると売掛金が預金に振り替わります。"}
            </p>
            <Button variant="ghost" size="sm" className="w-full text-red-700" onClick={remove} disabled={busy}>
              <Trash2 size={14} /> 削除
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
