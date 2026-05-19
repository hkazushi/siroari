"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getSite,
  saveSite,
  deleteSite,
  getCustomer,
  listVisitsBySite,
  deleteVisit,
} from "@/lib/db";
import { useEditor } from "@/lib/store";
import type { Site, Customer, Visit } from "@/types";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Calendar,
  Bug,
  ShieldCheck,
} from "lucide-react";

export default function SiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSite(id);
        if (!s) return;
        const [c, vs] = await Promise.all([
          getCustomer(s.customerId),
          listVisitsBySite(id),
        ]);
        if (cancelled) return;
        setSite(s);
        setCustomer(c ?? null);
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
    const s = await getSite(id);
    if (!s) return;
    const vs = await listVisitsBySite(id);
    setSite(s);
    setVisits(vs);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        読み込み中...
      </div>
    );
  }
  if (!site) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-slate-500">
        現場が見つかりません
      </div>
    );
  }

  const startNewVisit = () => {
    useEditor.getState().newProject(
      `${site.name} 第${visits.length + 1}回施工`,
    );
    useEditor.getState().setVisitMeta({
      customerId: site.customerId,
      siteId: site.id,
      visitNumber: visits.length + 1,
      visitDate: Date.now(),
    });
    router.push("/editor");
  };

  const openVisit = (v: Visit) => {
    useEditor.getState().loadProject(v);
    router.push("/editor");
  };

  const startWithCopy = () => {
    const prev = visits[0];
    if (!prev) {
      startNewVisit();
      return;
    }
    useEditor.getState().newProject(
      `${site.name} 第${visits.length + 1}回施工`,
    );
    useEditor.getState().setVisitMeta({
      customerId: site.customerId,
      siteId: site.id,
      visitNumber: visits.length + 1,
      visitDate: Date.now(),
    });
    useEditor.getState().copyFromVisit(prev);
    router.push("/editor");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="hover:opacity-80">
            <Logo size={36} withText={false} />
          </Link>
          <div className="leading-tight">
            <Link
              href={customer ? `/customers/${customer.id}` : "/customers"}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} />{" "}
              {customer ? `${customer.name} へ戻る` : "顧客一覧へ"}
            </Link>
            <div className="text-[14px] font-bold text-[#1e3a5f]">
              現場詳細
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {/* Site card */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-red-50 text-[#991b1b]">
              <MapPin size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-[#1e3a5f] sm:text-2xl">
                {site.name}
              </h1>
              {customer && (
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-[12px] text-slate-500 hover:text-[#991b1b]"
                >
                  {customer.name} 様
                </Link>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">
                {site.buildingType && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {site.buildingType}
                  </span>
                )}
                {site.floorArea && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {site.floorArea}㎡
                  </span>
                )}
              </div>
              {site.address && (
                <div className="mt-2 text-[13px] text-slate-700">{site.address}</div>
              )}
              {site.notes && (
                <div className="mt-2 whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                  {site.notes}
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
                      `「${site.name}」と配下の訪問記録すべてを削除します。よろしいですか？`,
                    )
                  ) {
                    await deleteSite(site.id);
                    router.push(
                      customer ? `/customers/${customer.id}` : "/customers",
                    );
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 size={12} /> 削除
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              onClick={startNewVisit}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#991b1b] px-4 py-3 text-sm font-bold text-white hover:bg-[#7f1d1d]"
            >
              <Plus size={16} /> 新規施工マップを作成
            </button>
            <button
              onClick={startWithCopy}
              disabled={visits.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50 disabled:opacity-40"
            >
              前回マップをコピーして開始
            </button>
          </div>
        </section>

        {/* Visit history */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-base font-bold text-[#1e3a5f]">
            訪問・施工履歴
          </h2>
          {visits.length === 0 ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
              まだ施工記録がありません
              <br />
              <button
                onClick={startNewVisit}
                className="mt-2 text-[#991b1b] hover:underline"
              >
                + 最初の施工マップを作成
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map((v) => {
                const pestCount = v.elements.filter(
                  (e) =>
                    e.type === "stamp" &&
                    [
                      "pestRoach",
                      "pestAnt",
                      "pestRodent",
                      "pestTermite",
                      "pestFly",
                    ].includes(e.stampType),
                ).length;
                const treatCount = v.elements.filter(
                  (e) =>
                    e.type === "stamp" &&
                    ["baitStation", "trapMouse", "trapGlue", "sprayZone"].includes(
                      e.stampType,
                    ),
                ).length;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <button
                      onClick={() => openVisit(v)}
                      className="group flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 group-hover:bg-red-100">
                        <Calendar
                          size={16}
                          className="text-slate-500 group-hover:text-[#991b1b]"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-semibold text-[#1e3a5f]">
                            第{v.visitNumber ?? "—"}回
                          </span>
                          <span className="truncate text-[12px] text-slate-700">
                            {v.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {v.visitDate
                            ? new Date(v.visitDate).toLocaleString("ja-JP", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              })
                            : new Date(v.updatedAt).toLocaleDateString("ja-JP")}
                          {v.technicianName && ` ／ 担当: ${v.technicianName}`}
                        </div>
                        <div className="mt-1 flex gap-3 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-[#991b1b]">
                            <Bug size={12} /> {pestCount}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[#1e3a5f]">
                            <ShieldCheck size={12} /> {treatCount}
                          </span>
                          <span className="text-slate-500">
                            {v.elements.length} 要素
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (
                          confirm(`「${v.name}」の施工記録を削除します。よろしいですか？`)
                        ) {
                          await deleteVisit(v.id);
                          await refresh();
                        }
                      }}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showEdit && (
        <EditSiteDialog
          site={site}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function EditSiteDialog({
  site,
  onClose,
  onSaved,
}: {
  site: Site;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Site>({ ...site });
  const submit = async () => {
    if (!form.name.trim()) {
      alert("現場名を入力してください");
      return;
    }
    await saveSite(form);
    onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="font-bold text-[#1e3a5f]">現場情報を編集</div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              現場名 *
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1 text-[11px] font-semibold text-slate-600">
                建物種別
              </div>
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
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] font-semibold text-slate-600">
                床面積（㎡）
              </div>
              <input
                type="number"
                value={form.floorArea ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    floorArea: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">住所</div>
            <input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              現場メモ
            </div>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            className="rounded-md bg-[#991b1b] px-4 py-2 text-sm font-bold text-white hover:bg-[#7f1d1d]"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
