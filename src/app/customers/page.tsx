"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import {
  listCustomers,
  saveCustomer,
  deleteCustomer,
  listSites,
  listVisits,
} from "@/lib/db";
import type { Customer, Site, Visit } from "@/types";
import { Logo } from "@/components/Logo";
import { Plus, Building2, Home, Search, ChevronRight, ArrowLeft } from "lucide-react";

type Counts = Record<string, { sites: number; visits: number }>;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");

  const refresh = async () => {
    const [cs, sites, visits] = await Promise.all([
      listCustomers(),
      listSites(),
      listVisits(),
    ]);
    setCustomers(cs);
    const c: Counts = {};
    for (const cust of cs) c[cust.id] = { sites: 0, visits: 0 };
    sites.forEach((s: Site) => {
      if (c[s.customerId]) c[s.customerId].sites += 1;
    });
    visits.forEach((v: Visit) => {
      if (v.customerId && c[v.customerId]) c[v.customerId].visits += 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cs, sites, visits] = await Promise.all([
          listCustomers(),
          listSites(),
          listVisits(),
        ]);
        if (cancelled) return;
        setCustomers(cs);
        const c: Counts = {};
        for (const cust of cs) c[cust.id] = { sites: 0, visits: 0 };
        sites.forEach((s) => {
          if (c[s.customerId]) c[s.customerId].sites += 1;
        });
        visits.forEach((v) => {
          if (v.customerId && c[v.customerId]) c[v.customerId].visits += 1;
        });
        setCounts(c);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.kana ?? "").includes(q) ||
          (c.address ?? "").includes(q),
      )
    : customers;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="hover:opacity-80">
            <Logo size={36} withText={false} />
          </Link>
          <div className="leading-tight">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} /> トップへ
            </Link>
            <div className="text-[14px] font-bold text-[#1e3a5f]">
              顧客台帳
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#991b1b] px-3 py-2 text-sm font-bold text-white hover:bg-[#7f1d1d]"
          >
            <Plus size={16} /> 新規顧客
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="顧客名・カナ・住所で検索"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <Building2 size={48} className="mx-auto text-slate-300" />
            <div className="mt-3 text-slate-700">
              {q ? "該当する顧客がありません" : "顧客がまだ登録されていません"}
            </div>
            {!q && (
              <button
                onClick={() => setShowNew(true)}
                className="mt-3 text-sm text-[#991b1b] hover:underline"
              >
                + 最初の顧客を登録する
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#991b1b] hover:shadow"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-red-50 group-hover:text-[#991b1b]">
                  {c.type === "commercial" ? (
                    <Building2 size={20} />
                  ) : (
                    <Home size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-[#1e3a5f]">
                    {c.name}
                  </div>
                  {c.kana && (
                    <div className="truncate text-[11px] text-slate-400">
                      {c.kana}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                    <span>{c.type === "commercial" ? "法人・店舗" : "個人住宅"}</span>
                    {c.contractType && (
                      <span>
                        {(
                          {
                            spot: "スポット",
                            monthly: "月次",
                            quarterly: "四半期",
                            annual: "年契約",
                          } as const
                        )[c.contractType]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex gap-3 text-[11px] text-slate-600">
                    <span>
                      <strong>{counts[c.id]?.sites ?? 0}</strong> 現場
                    </span>
                    <span>
                      <strong>{counts[c.id]?.visits ?? 0}</strong> 訪問
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="self-center text-slate-300 group-hover:text-[#991b1b]"
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      {showNew && (
        <NewCustomerDialog
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function NewCustomerDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Customer>>({
    name: "",
    kana: "",
    type: "commercial",
    address: "",
    contactPerson: "",
    contactPhone: "",
    contractType: "spot",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name?.trim()) {
      alert("顧客名を入力してください");
      return;
    }
    setSaving(true);
    const now = Date.now();
    const c: Customer = {
      id: nanoid(10),
      name: form.name.trim(),
      kana: form.kana?.trim() || undefined,
      type: form.type ?? "commercial",
      address: form.address?.trim() || undefined,
      contactPerson: form.contactPerson?.trim() || undefined,
      contactPhone: form.contactPhone?.trim() || undefined,
      contractType: form.contractType,
      notes: form.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await saveCustomer(c);
    await onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="font-bold text-[#1e3a5f]">新規顧客の登録</div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <Field label="顧客名 *">
            <input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例: ○○ビル管理組合 / 山田 太郎 様"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="フリガナ">
            <input
              value={form.kana ?? ""}
              onChange={(e) => setForm({ ...form, kana: e.target.value })}
              placeholder="マルマルビルカンリクミアイ"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="区分">
            <div className="flex gap-2">
              {(["residential", "commercial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    form.type === t
                      ? "border-[#991b1b] bg-red-50 text-[#991b1b] font-bold"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {t === "residential" ? "個人住宅" : "法人・店舗"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="住所">
            <input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="○○市○○町 1-2-3"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="担当者">
              <input
                value={form.contactPerson ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactPerson: e.target.value })
                }
                placeholder="山田 太郎"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="電話番号">
              <input
                value={form.contactPhone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                placeholder="000-0000-0000"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="tel"
              />
            </Field>
          </div>
          <Field label="契約形態">
            <select
              value={form.contractType ?? "spot"}
              onChange={(e) =>
                setForm({
                  ...form,
                  contractType: e.target.value as Customer["contractType"],
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="spot">スポット（単発）</option>
              <option value="monthly">月次定期</option>
              <option value="quarterly">四半期定期</option>
              <option value="annual">年契約</option>
            </select>
          </Field>
          <Field label="メモ">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-[#991b1b] px-4 py-2 text-sm font-bold text-white hover:bg-[#7f1d1d] disabled:opacity-50"
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">
        {label}
      </div>
      {children}
    </label>
  );
}

// avoid "deleteCustomer is unused" lint nag when not used yet
void deleteCustomer;
