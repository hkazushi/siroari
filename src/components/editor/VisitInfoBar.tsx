"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useEditor } from "@/lib/store";
import { getCustomer, getSite } from "@/lib/db";
import type { Customer, Site } from "@/types";
import { Building2, Home, ChevronRight, Info, Edit2 } from "lucide-react";

export function VisitInfoBar({
  onEdit,
}: {
  onEdit: () => void;
}) {
  const { customerId, siteId, visitNumber, visitDate, technicianName } =
    useEditor();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = customerId ? await getCustomer(customerId) : undefined;
      const s = siteId ? await getSite(siteId) : undefined;
      if (cancelled) return;
      setCustomer(c ?? null);
      setSite(s ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, siteId]);

  if (!customerId && !siteId) {
    return (
      <div className="flex items-center gap-2 border-b border-slate-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800">
        <Info size={14} />
        <span>顧客・現場が未紐付けです。</span>
        <Link
          href="/customers"
          className="font-bold text-[#991b1b] hover:underline"
        >
          顧客台帳から開く →
        </Link>
        <button
          onClick={onEdit}
          className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-900"
        >
          <Edit2 size={11} /> 担当者・次回予定を編集
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px]">
      <div className="flex items-center gap-1.5">
        {customer && (
          <>
            {customer.type === "commercial" ? (
              <Building2 size={13} className="text-[#1e3a5f]" />
            ) : (
              <Home size={13} className="text-[#1e3a5f]" />
            )}
            <Link
              href={`/customers/${customer.id}`}
              className="font-bold text-[#1e3a5f] hover:underline"
            >
              {customer.name}
            </Link>
          </>
        )}
        {site && (
          <>
            <ChevronRight size={12} className="text-slate-400" />
            <Link
              href={`/sites/${site.id}`}
              className="font-semibold text-[#1e3a5f] hover:underline"
            >
              {site.name}
            </Link>
          </>
        )}
        {visitNumber && (
          <>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="rounded-full bg-[#991b1b] px-2 py-0.5 text-[10px] font-bold text-white">
              第 {visitNumber} 回
            </span>
          </>
        )}
      </div>
      {visitDate && (
        <span className="text-slate-500">
          {new Date(visitDate).toLocaleDateString("ja-JP")}
        </span>
      )}
      {technicianName && (
        <span className="text-slate-500">担当: {technicianName}</span>
      )}
      <button
        onClick={onEdit}
        className="ml-auto inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
      >
        <Edit2 size={11} /> 訪問情報
      </button>
    </div>
  );
}
