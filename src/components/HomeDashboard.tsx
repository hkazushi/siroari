"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listCustomers,
  listSites,
  listVisits,
} from "@/lib/db";
import { useEditor } from "@/lib/store";
import { PEST_STAMP_TYPES } from "@/lib/stamps";
import type { Customer, Site, Visit } from "@/types";
import {
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  Plus,
  FileText,
  ChevronRight,
  Building2,
  Home as HomeIcon,
  Sparkles,
  Pencil,
} from "lucide-react";

/** ランディングのダッシュボード部分（統計 + 最近の現場 + クイックアクション） */
export function HomeDashboard() {
  const router = useRouter();
  const [data, setData] = useState<{
    customers: Customer[];
    sites: Site[];
    visits: Visit[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. 起動時にクラウドから自動同期（端末跨ぎでデータが見える化）
      try {
        const { isCloudConfigured } = await import("@/lib/supabase");
        if (isCloudConfigured()) {
          const last = Number(localStorage.getItem("lastAutoPullAt") ?? 0);
          if (Date.now() - last > 5 * 60 * 1000) {
            const { pullAllFromCloud } = await import("@/lib/sync");
            await pullAllFromCloud();
            localStorage.setItem("lastAutoPullAt", String(Date.now()));
          }
        }
      } catch (e) {
        console.warn("home auto pull failed", e);
      }

      // 2. ローカルから表示用データ取得
      const [customers, sites, visits] = await Promise.all([
        listCustomers(),
        listSites(),
        listVisits(),
      ]);
      if (cancelled) return;
      setData({ customers, sites, visits });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <div className="h-2" />;
  return <Dashboard data={data} router={router} />;
}

function Dashboard({
  data,
  router,
}: {
  data: { customers: Customer[]; sites: Site[]; visits: Visit[] };
  router: ReturnType<typeof useRouter>;
}) {
  // Date.now() を render から分離（react-hooks/purity 対策）
  const [now] = useState(() => Date.now());
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonthVisits = data.visits.filter(
    (v) => v.visitDate && v.visitDate >= startOfMonth.getTime(),
  ).length;
  const overdue = data.visits.filter(
    (v) => v.nextVisitDate && v.nextVisitDate < now,
  ).length;
  const upcomingWeek = data.visits.filter(
    (v) =>
      v.nextVisitDate &&
      v.nextVisitDate >= now &&
      v.nextVisitDate <= now + 7 * 24 * 3600 * 1000,
  ).length;

  const customerMap = new Map(data.customers.map((c) => [c.id, c]));
  const siteMap = new Map(data.sites.map((s) => [s.id, s]));
  const recentVisits = data.visits.slice(0, 5);

  const openVisit = (v: Visit) => {
    useEditor.getState().loadProject(v);
    router.push("/editor");
  };

  // 表示するデータが何も無い場合の hero（オンボーディング）
  if (
    data.customers.length === 0 &&
    data.sites.length === 0 &&
    data.visits.length === 0
  ) {
    return (
      <section className="bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:p-10">
            <div className="text-base font-bold text-[#1e3a5f] sm:text-lg">
              はじめての方へ
            </div>
            <div className="mt-1 text-sm text-slate-600">
              まずは「顧客台帳」でお客様を登録するか、すぐにマップを描き始めましょう。
            </div>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link
                href="/customers"
                className="inline-flex items-center gap-2 rounded-lg bg-[#991b1b] px-5 py-3 text-sm font-bold text-white hover:bg-[#7f1d1d]"
              >
                <Plus size={16} /> 最初の顧客を登録
              </Link>
              <Link
                href="/editor?new=1"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50"
              >
                <MapPin size={16} /> いきなりマップを描く
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard
            icon={Users}
            label="顧客"
            value={data.customers.length}
            href="/customers"
          />
          <StatCard
            icon={MapPin}
            label="現場"
            value={data.sites.length}
            href="/customers"
          />
          <StatCard
            icon={FileText}
            label="今月の訪問"
            value={thisMonthVisits}
            href="/calendar"
          />
          <StatCard
            icon={AlertCircle}
            label="期日超過"
            value={overdue}
            warn={overdue > 0}
            href="/calendar"
          />
        </div>

        {/* Recent visits */}
        {recentVisits.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-[#1e3a5f]">
                最近の現場マップ
              </div>
              <Link
                href="/projects"
                className="text-[11px] text-slate-500 hover:text-[#991b1b]"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentVisits.map((v) => {
                const cust = v.customerId
                  ? customerMap.get(v.customerId)
                  : undefined;
                const site = v.siteId ? siteMap.get(v.siteId) : undefined;
                const pestCount = v.elements.filter(
                  (e) =>
                    e.type === "stamp" &&
                    (PEST_STAMP_TYPES as string[]).includes(e.stampType),
                ).length;
                return (
                  <button
                    key={v.id}
                    onClick={() => openVisit(v)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-[#991b1b] hover:bg-red-50/30"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 group-hover:bg-red-100">
                      {cust?.type === "commercial" ? (
                        <Building2
                          size={18}
                          className="text-slate-500 group-hover:text-[#991b1b]"
                        />
                      ) : (
                        <HomeIcon
                          size={18}
                          className="text-slate-500 group-hover:text-[#991b1b]"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-[#1e3a5f]">
                        {cust?.name ?? "—"}
                        {site && (
                          <span className="text-[11px] font-normal text-slate-500">
                            {" "}
                            / {site.name}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {v.name}
                        {v.visitDate &&
                          ` ／ ${new Date(v.visitDate).toLocaleDateString("ja-JP")}`}
                      </div>
                      {pestCount > 0 && (
                        <div className="mt-0.5 text-[10px] text-[#991b1b]">
                          害虫 {pestCount} 箇所
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-[#991b1b]"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingWeek > 0 && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <Link
              href="/calendar"
              className="flex items-center gap-2 text-sm font-bold text-amber-800 hover:underline"
            >
              <Calendar size={16} />
              今週、訪問予定が {upcomingWeek} 件あります
              <ChevronRight size={14} className="ml-auto" />
            </Link>
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            href="/editor?new=1"
            className="inline-flex flex-col items-center gap-1 rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 px-4 py-3 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-rose-600"
          >
            <Sparkles size={20} />
            <span>AI マップ</span>
            <span className="text-[9px] font-normal opacity-80">音声で作成</span>
          </Link>
          <Link
            href="/editor?new=1&tool=sketch"
            className="inline-flex flex-col items-center gap-1 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow hover:from-rose-600 hover:to-purple-700"
          >
            <Pencil size={20} />
            <span>手描きで描く</span>
            <span className="text-[9px] font-normal opacity-80">指/Pencilで</span>
          </Link>
          <Link
            href="/assistant"
            className="inline-flex flex-col items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
          >
            <Sparkles size={20} />
            <span>AI 相談</span>
          </Link>
          <Link
            href="/customers"
            className="inline-flex flex-col items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50"
          >
            <Users size={20} />
            <span>顧客台帳</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex flex-col items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50"
          >
            <Calendar size={20} />
            <span>予定</span>
          </Link>
          <Link
            href="/projects"
            className="inline-flex flex-col items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50"
          >
            <FileText size={20} />
            <span>全現場</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  warn,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  warn?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-xl border p-3 sm:p-4 ${
        warn
          ? "border-red-300 bg-red-50 hover:bg-red-100"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={16}
          className={warn ? "text-red-500" : "text-slate-400"}
        />
        <div
          className={`text-[10px] font-semibold ${warn ? "text-red-600" : "text-slate-500"}`}
        >
          {label}
        </div>
      </div>
      <div
        className={`mt-1 text-2xl font-black sm:text-3xl ${warn ? "text-red-600" : "text-[#1e3a5f]"}`}
      >
        {value}
      </div>
    </Link>
  );
}
