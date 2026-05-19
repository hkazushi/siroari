"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listVisits, listCustomers, listSites } from "@/lib/db";
import { useEditor } from "@/lib/store";
import type { Visit, Customer, Site } from "@/types";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  AlertCircle,
  MapPin,
} from "lucide-react";

type Row = {
  visit: Visit;
  site?: Site;
  customer?: Customer;
  daysUntil: number; // 0 = today, negative = overdue
};

export default function CalendarPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [visits, customers, sites] = await Promise.all([
          listVisits(),
          listCustomers(),
          listSites(),
        ]);
        if (cancelled) return;
        const cMap = new Map(customers.map((c) => [c.id, c]));
        const sMap = new Map(sites.map((s) => [s.id, s]));
        const now = Date.now();
        const future: Row[] = [];
        for (const v of visits) {
          if (!v.nextVisitDate) continue;
          const days = Math.round(
            (v.nextVisitDate - now) / (1000 * 60 * 60 * 24),
          );
          future.push({
            visit: v,
            site: v.siteId ? sMap.get(v.siteId) : undefined,
            customer: v.customerId ? cMap.get(v.customerId) : undefined,
            daysUntil: days,
          });
        }
        future.sort((a, b) => a.daysUntil - b.daysUntil);
        setRows(future);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overdue = rows.filter((r) => r.daysUntil < 0);
  const today = rows.filter((r) => r.daysUntil === 0);
  const thisWeek = rows.filter((r) => r.daysUntil > 0 && r.daysUntil <= 7);
  const thisMonth = rows.filter((r) => r.daysUntil > 7 && r.daysUntil <= 31);
  const later = rows.filter((r) => r.daysUntil > 31);

  const openVisit = (v: Visit) => {
    useEditor.getState().loadProject(v);
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
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} /> トップへ
            </Link>
            <div className="text-[14px] font-bold text-[#1e3a5f]">
              訪問スケジュール
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500">
            読み込み中...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <CalendarIcon size={48} className="mx-auto text-slate-300" />
            <div className="mt-3 text-slate-700">
              次回訪問予定が設定された現場がありません
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              エディタの「訪問情報」で次回訪問日を設定すると、ここに表示されます。
            </div>
            <Link
              href="/customers"
              className="mt-3 inline-block text-sm text-[#991b1b] hover:underline"
            >
              → 顧客台帳へ
            </Link>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <Section
                title="⚠️ 期日超過"
                color="red"
                rows={overdue}
                onOpen={openVisit}
              />
            )}
            {today.length > 0 && (
              <Section
                title="🔥 今日"
                color="amber"
                rows={today}
                onOpen={openVisit}
              />
            )}
            {thisWeek.length > 0 && (
              <Section
                title="📅 今週中"
                color="blue"
                rows={thisWeek}
                onOpen={openVisit}
              />
            )}
            {thisMonth.length > 0 && (
              <Section
                title="📆 今月中"
                color="slate"
                rows={thisMonth}
                onOpen={openVisit}
              />
            )}
            {later.length > 0 && (
              <Section
                title="🗓️ 先の予定"
                color="slate"
                rows={later}
                onOpen={openVisit}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  color,
  rows,
  onOpen,
}: {
  title: string;
  color: "red" | "amber" | "blue" | "slate";
  rows: Row[];
  onOpen: (v: Visit) => void;
}) {
  const barClass =
    color === "red"
      ? "border-red-500"
      : color === "amber"
        ? "border-amber-500"
        : color === "blue"
          ? "border-[#1e3a5f]"
          : "border-slate-300";
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div
        className={`mb-3 border-l-4 ${barClass} pl-2 text-base font-bold text-[#1e3a5f]`}
      >
        {title}{" "}
        <span className="text-[12px] font-normal text-slate-500">
          ({rows.length})
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.visit.id}
            onClick={() => onOpen(r.visit)}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-[#991b1b] hover:bg-red-50/30"
          >
            <div className="w-20 shrink-0 text-center">
              <div
                className={`text-[10px] font-bold ${color === "red" ? "text-red-500" : "text-slate-500"}`}
              >
                {r.daysUntil < 0
                  ? `${-r.daysUntil}日超過`
                  : r.daysUntil === 0
                    ? "今日"
                    : `あと${r.daysUntil}日`}
              </div>
              <div className="text-[11px] font-semibold text-[#1e3a5f]">
                {new Date(r.visit.nextVisitDate!).toLocaleDateString("ja-JP", {
                  month: "2-digit",
                  day: "2-digit",
                })}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-[#1e3a5f]">
                {r.customer?.name ?? "—"}{" "}
                {r.site && (
                  <span className="text-[12px] font-normal text-slate-500">
                    / {r.site.name}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {r.visit.name}
                {r.visit.technicianName &&
                  ` ／ 担当: ${r.visit.technicianName}`}
              </div>
            </div>
            {color === "red" && (
              <AlertCircle size={18} className="text-red-500" />
            )}
            {r.site && (
              <Link
                href={`/sites/${r.site.id}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#991b1b]"
                title="現場詳細へ"
              >
                <MapPin size={14} />
              </Link>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
