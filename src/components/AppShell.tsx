"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileText,
  Home,
  List,
  LogOut,
  Plus,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useData } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { BackgroundCat, CatHead } from "./Cat";
import { TxDialogProvider, useTxDialog } from "./TransactionDialog";
import { Button, Spinner } from "./ui";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/transactions", label: "取引", icon: List },
  { href: "/invoices", label: "請求書", icon: FileText },
  { href: "/reports", label: "決算・帳簿", icon: BarChart3 },
  { href: "/assets", label: "固定資産", icon: Building2 },
  { href: "/partners", label: "取引先", icon: Users },
  { href: "/settings", label: "設定", icon: Settings },
];

// モバイル下部タブ（中央は「＋取引」）
const TABS = [NAV[0], NAV[1], null, NAV[2], NAV[3]] as const;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TxDialogProvider>
      <Shell>{children}</Shell>
    </TxDialogProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { openNew } = useTxDialog();
  const { loading, error, reload, profile } = useData();

  // 印刷用ページはナビを出さない
  if (path.endsWith("/print") || path.startsWith("/reports/blue-return")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <CatHead size={34} />
            <div className="leading-tight">
              <div className="text-sm font-bold text-[#1e3a5f]">会計アプリ</div>
              <div className="text-[10px] text-slate-500">{profile.trade_name || "東山メンテナンス"}</div>
            </div>
          </Link>
          <nav className="ml-4 hidden flex-1 items-center gap-0.5 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap",
                  isActive(path, n.href)
                    ? "bg-[#1e3a5f]/8 font-semibold text-[#1e3a5f]"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" className="hidden md:inline-flex" onClick={() => openNew()}>
              <Plus size={14} /> 取引を登録
            </Button>
            <Link
              href="/settings"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="設定"
            >
              <Settings size={18} />
            </Link>
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              title="ログアウト"
              aria-label="ログアウト"
              onClick={() => {
                if (confirm("ログアウトしますか？")) void supabase().auth.signOut();
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <BackgroundCat />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-5">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-bold">データを読み込めませんでした</p>
            <p className="mt-1 break-all">{error}</p>
            <p className="mt-2 text-xs">
              テーブル未作成の場合は supabase/schema.sql を SQL Editor で実行してください。Supabase
              が一時停止している場合は Dashboard から再開してください。
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
              再読み込み
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Spinner />
          </div>
        ) : (
          children
        )}
      </main>

      {/* モバイル下部タブ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
        <div className="grid h-16 grid-cols-5">
          {TABS.map((n, i) =>
            n ? (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px]",
                  isActive(path, n.href) ? "font-semibold text-[#1e3a5f]" : "text-slate-500",
                )}
              >
                <n.icon size={20} />
                {n.label}
              </Link>
            ) : (
              <button
                key={`add-${i}`}
                onClick={() => openNew()}
                className="flex items-center justify-center"
                aria-label="取引を登録"
              >
                <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#991b1b] text-white shadow-lg">
                  <Plus size={26} />
                </span>
              </button>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

/** モバイルで下部タブに無いページへのリンク集（ホームで使う） */
export const MORE_LINKS = NAV.slice(4);
