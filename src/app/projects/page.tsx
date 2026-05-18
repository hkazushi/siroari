"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listProjects, deleteProject } from "@/lib/db";
import { useEditor } from "@/lib/store";
import type { FloorPlan } from "@/types";
import { formatArea, polygonArea } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export default function ProjectsPage() {
  const [list, setList] = useState<FloorPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    const items = await listProjects();
    setList(items);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const items = await listProjects();
      if (!cancelled) {
        setList(items);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-80">
            <Logo size={56} withText={false} />
          </Link>
          <div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800">
              ← トップへ
            </Link>
            <h1 className="mt-0.5 text-2xl font-bold text-[#1e3a5f]">
              過去の現場記録
            </h1>
            <div className="text-[11px] text-slate-500">
              東山メンテナンス
            </div>
          </div>
        </div>
        <Link
          href="/editor"
          className="rounded-lg bg-[#991b1b] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#7f1d1d]"
        >
          + 新規現場
        </Link>
      </div>

      {loading ? (
        <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          読み込み中...
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <div className="mb-2 text-slate-700">現場記録がまだありません</div>
          <Link
            href="/editor"
            className="text-sm text-[#991b1b] hover:underline"
          >
            最初の現場を記録する →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const rooms = p.elements.filter((e) => e.type === "room");
            const totalArea = rooms.reduce(
              (s, r) =>
                s + ("points" in r ? polygonArea((r as { points: { x: number; y: number }[] }).points) : 0),
              0,
            );
            return (
              <div
                key={p.id}
                className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow"
              >
                <button
                  onClick={async () => {
                    useEditor.getState().loadProject(p);
                    router.push("/editor");
                  }}
                  className="block w-full text-left"
                >
                  <div className="text-base font-semibold text-slate-900">{p.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{new Date(p.updatedAt).toLocaleString("ja-JP")}</span>
                    <span>{p.elements.length} 要素</span>
                    <span>{rooms.length} 部屋</span>
                    {totalArea > 0 && <span>{formatArea(totalArea)}</span>}
                  </div>
                </button>
                <div className="mt-3 flex justify-end">
                  <button
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                    onClick={async () => {
                      if (confirm(`「${p.name}」を削除しますか？`)) {
                        await deleteProject(p.id);
                        refresh();
                      }
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
