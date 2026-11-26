"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Spinner, Textarea } from "@/components/ui";
import { useData } from "@/lib/data";
import { yearOf, yen } from "@/lib/format";
import type { Partner, PartnerInput } from "@/lib/types";
import { useYear } from "@/lib/year";

const BLANK: PartnerInput = { name: "", kana: "", address: "", phone: "", email: "", notes: "" };

export default function PartnersPage() {
  const { partners, transactions } = useData();
  const { year } = useYear();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Partner | "new" | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { sales: number; unpaid: number }>();
    for (const t of transactions) {
      if (t.kind !== "income" || !t.partner_name) continue;
      const s = m.get(t.partner_name) ?? { sales: 0, unpaid: 0 };
      if (yearOf(t.date) === year) s.sales += t.amount;
      if (t.status === "unpaid") s.unpaid += t.amount;
      m.set(t.partner_name, s);
    }
    return m;
  }, [transactions, year]);

  const list = partners
    .filter((p) => !q || `${p.name}${p.kana}${p.address}${p.phone}`.includes(q))
    .sort((a, b) => (a.kana || a.name).localeCompare(b.kana || b.name, "ja"));

  return (
    <div>
      <PageHeader
        title="取引先"
        description="お客様・仕入先。請求書の宛先や取引入力の候補に使われます"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={16} /> 取引先を追加
          </Button>
        }
      />
      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名前・住所・電話で検索" className="pl-8" />
      </div>
      <Card>
        {list.length === 0 ? (
          <Empty>取引先がありません</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((p) => {
              const s = stats.get(p.name);
              return (
                <li key={p.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50" onClick={() => setEditing(p)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {[p.address, p.phone].filter(Boolean).join(" ・ ") || "—"}
                      </span>
                    </span>
                    <span className="text-right text-[11px] text-slate-500">
                      {s?.sales ? <span className="block">{year}年売上 {yen(s.sales)}</span> : null}
                      {s?.unpaid ? <span className="block text-red-700">未入金 {yen(s.unpaid)}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {editing && <PartnerDialog partner={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PartnerDialog({ partner, onClose }: { partner: Partner | null; onClose: () => void }) {
  const { addPartner, updatePartner, deletePartner } = useData();
  const [form, setForm] = useState<PartnerInput>(() =>
    partner
      ? { name: partner.name, kana: partner.kana, address: partner.address, phone: partner.phone, email: partner.email, notes: partner.notes }
      : BLANK,
  );
  const [busy, setBusy] = useState(false);
  const set = (k: keyof PartnerInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (partner) await updatePartner(partner.id, form);
      else await addPartner(form);
      onClose();
    } catch (e) {
      alert(`保存できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }
  async function remove() {
    if (!partner || !confirm(`「${partner.name}」を削除しますか？（取引の記録は残ります）`)) return;
    setBusy(true);
    try {
      await deletePartner(partner.id);
      onClose();
    } catch (e) {
      alert(`削除できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={partner ? "取引先を編集" : "取引先を追加"}
      footer={
        <>
          {partner && (
            <Button variant="ghost" className="mr-auto text-red-700" onClick={remove} disabled={busy}>
              <Trash2 size={15} /> 削除
            </Button>
          )}
          <Button onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? <Spinner /> : "保存"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="名前（請求書の宛名）">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例: 山田 太郎 / 株式会社〇〇" />
        </Field>
        <Field label="ふりがな（並び替え用）">
          <Input value={form.kana} onChange={(e) => set("kana", e.target.value)} />
        </Field>
        <Field label="住所">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="電話">
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="メール">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="メモ">
          <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
