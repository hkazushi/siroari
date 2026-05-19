"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  getCustomer,
  saveCustomer,
  deleteCustomer,
  listSitesByCustomer,
  saveSite,
  listVisitsByCustomer,
} from "@/lib/db";
import type { Customer, Site, Visit } from "@/types";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  Building2,
  Home,
  MapPin,
  Plus,
  Phone,
  Mail,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewSite, setShowNewSite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, ss, vs] = await Promise.all([
          getCustomer(id),
          listSitesByCustomer(id),
          listVisitsByCustomer(id),
        ]);
        if (cancelled) return;
        setCustomer(c ?? null);
        setSites(ss);
        setVisits(vs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const refresh = async () => {
    const [c, ss, vs] = await Promise.all([
      getCustomer(id),
      listSitesByCustomer(id),
      listVisitsByCustomer(id),
    ]);
    setCustomer(c ?? null);
    setSites(ss);
    setVisits(vs);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        読み込み中...
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        顧客が見つかりません
        <Link href="/customers" className="ml-2 text-[#991b1b] underline">
          一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="hover:opacity-80">
            <Logo size={36} withText={false} />
          </Link>
          <div className="leading-tight">
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} /> 顧客一覧
            </Link>
            <div className="text-[14px] font-bold text-[#1e3a5f]">
              顧客詳細
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {/* Customer card */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-red-50 text-[#991b1b]">
              {customer.type === "commercial" ? (
                <Building2 size={24} />
              ) : (
                <Home size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">
                {customer.name}
              </h1>
              {customer.kana && (
                <div className="text-[12px] text-slate-500">{customer.kana}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                  {customer.type === "commercial" ? "法人・店舗" : "個人住宅"}
                </span>
                {customer.contractType && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {(
                      {
                        spot: "スポット",
                        monthly: "月次定期",
                        quarterly: "四半期",
                        annual: "年契約",
                      } as const
                    )[customer.contractType]}
                  </span>
                )}
              </div>
              {customer.address && (
                <div className="mt-2 flex items-start gap-1 text-[13px] text-slate-700">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{customer.address}</span>
                </div>
              )}
              {customer.contactPerson && (
                <div className="mt-1 text-[13px] text-slate-700">
                  担当: {customer.contactPerson}
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-3 text-[13px] text-slate-700">
                {customer.contactPhone && (
                  <a
                    href={`tel:${customer.contactPhone}`}
                    className="inline-flex items-center gap-1 text-[#1e3a5f] hover:underline"
                  >
                    <Phone size={14} /> {customer.contactPhone}
                  </a>
                )}
                {customer.contactEmail && (
                  <a
                    href={`mailto:${customer.contactEmail}`}
                    className="inline-flex items-center gap-1 text-[#1e3a5f] hover:underline"
                  >
                    <Mail size={14} /> {customer.contactEmail}
                  </a>
                )}
              </div>
              {customer.notes && (
                <div className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  {customer.notes}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={12} /> 編集
              </button>
              <button
                onClick={async () => {
                  if (
                    confirm(
                      `「${customer.name}」と配下の現場・訪問記録すべてを削除します。よろしいですか？`,
                    )
                  ) {
                    await deleteCustomer(customer.id);
                    router.push("/customers");
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={12} /> 削除
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <div className="text-[10px] text-slate-500">現場数</div>
              <div className="text-xl font-black text-[#1e3a5f]">
                {sites.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">累計訪問数</div>
              <div className="text-xl font-black text-[#1e3a5f]">
                {visits.length}
              </div>
            </div>
          </div>
        </section>

        {/* Sites list */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1e3a5f]">現場一覧</h2>
            <button
              onClick={() => setShowNewSite(true)}
              className="inline-flex items-center gap-1 rounded-md bg-[#991b1b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d]"
            >
              <Plus size={14} /> 現場追加
            </button>
          </div>
          {sites.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
              現場がまだ登録されていません
              <br />
              <button
                onClick={() => setShowNewSite(true)}
                className="mt-2 text-[#991b1b] hover:underline"
              >
                + 最初の現場を追加
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map((s) => {
                const visitCount = visits.filter((v) => v.siteId === s.id).length;
                return (
                  <Link
                    key={s.id}
                    href={`/sites/${s.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-[#991b1b] hover:bg-red-50/30"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 group-hover:bg-red-100">
                      <MapPin size={16} className="text-slate-500 group-hover:text-[#991b1b]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-[#1e3a5f]">
                        {s.name}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-[11px] text-slate-500">
                        {s.buildingType && <span>{s.buildingType}</span>}
                        {s.floorArea && <span>{s.floorArea}㎡</span>}
                        <span>{visitCount} 回訪問</span>
                      </div>
                      {s.address && (
                        <div className="truncate text-[11px] text-slate-500">
                          {s.address}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-[#991b1b]" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showEdit && (
        <EditCustomerDialog
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await refresh();
          }}
        />
      )}
      {showNewSite && (
        <NewSiteDialog
          customerId={customer.id}
          onClose={() => setShowNewSite(false)}
          onCreated={async () => {
            setShowNewSite(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function EditCustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Customer>({ ...customer });

  const submit = async () => {
    if (!form.name.trim()) {
      alert("顧客名を入力してください");
      return;
    }
    await saveCustomer(form);
    onSaved();
  };

  return (
    <DialogShell title="顧客情報を編集" onClose={onClose}>
      <div className="space-y-3 p-4">
        <Field label="顧客名 *">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="フリガナ">
          <input
            value={form.kana ?? ""}
            onChange={(e) => setForm({ ...form, kana: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="区分">
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as Customer["type"] })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="residential">個人住宅</option>
              <option value="commercial">法人・店舗</option>
            </select>
          </Field>
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
              <option value="spot">スポット</option>
              <option value="monthly">月次</option>
              <option value="quarterly">四半期</option>
              <option value="annual">年契約</option>
            </select>
          </Field>
        </div>
        <Field label="住所">
          <input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="電話番号">
            <input
              value={form.contactPhone ?? ""}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="tel"
            />
          </Field>
        </div>
        <Field label="メールアドレス">
          <input
            value={form.contactEmail ?? ""}
            onChange={(e) =>
              setForm({ ...form, contactEmail: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="email"
          />
        </Field>
        <Field label="メモ">
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <DialogFooter onClose={onClose} onSubmit={submit} submitLabel="保存" />
    </DialogShell>
  );
}

function NewSiteDialog({
  customerId,
  onClose,
  onCreated,
}: {
  customerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<Partial<Site>>({
    name: "",
    buildingType: "",
    address: "",
    floorArea: undefined,
    notes: "",
  });

  const submit = async () => {
    if (!form.name?.trim()) {
      alert("現場名を入力してください");
      return;
    }
    const now = Date.now();
    const s: Site = {
      id: nanoid(10),
      customerId,
      name: form.name.trim(),
      address: form.address?.trim() || undefined,
      buildingType: form.buildingType?.trim() || undefined,
      floorArea: form.floorArea,
      notes: form.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await saveSite(s);
    onCreated();
  };

  return (
    <DialogShell title="新規現場の登録" onClose={onClose}>
      <div className="space-y-3 p-4">
        <Field label="現場名 *">
          <input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="○○ビル 1F / ご自宅 / 第二工場"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="建物種別">
            <select
              value={form.buildingType ?? ""}
              onChange={(e) =>
                setForm({ ...form, buildingType: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">選択</option>
              <option value="住宅">住宅</option>
              <option value="マンション">マンション</option>
              <option value="飲食店">飲食店</option>
              <option value="食品工場">食品工場</option>
              <option value="オフィス">オフィス</option>
              <option value="病院・医院">病院・医院</option>
              <option value="倉庫">倉庫</option>
              <option value="ホテル・旅館">ホテル・旅館</option>
              <option value="学校・保育園">学校・保育園</option>
              <option value="その他">その他</option>
            </select>
          </Field>
          <Field label="床面積（㎡）">
            <input
              type="number"
              value={form.floorArea ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  floorArea: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="100"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="住所">
          <input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="現場メモ">
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="鍵の保管場所、注意事項など"
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <DialogFooter onClose={onClose} onSubmit={submit} submitLabel="登録" />
    </DialogShell>
  );
}

function DialogShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="font-bold text-[#1e3a5f]">{title}</div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogFooter({
  onClose,
  onSubmit,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <button
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        キャンセル
      </button>
      <button
        onClick={onSubmit}
        className="rounded-md bg-[#991b1b] px-4 py-2 text-sm font-bold text-white hover:bg-[#7f1d1d]"
      >
        {submitLabel}
      </button>
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
