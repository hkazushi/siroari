"use client";

import { useMemo, useState } from "react";
import { Stage, Layer, Group } from "react-konva";
import { STAMP_LIBRARY, CATEGORY_ORDER, type StampCategory } from "@/lib/stamps";
import { useEditor } from "@/lib/store";
import { StampGraphic } from "./StampShape";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

const CATEGORY_COLORS: Record<StampCategory, string> = {
  害虫: "text-[#991b1b] bg-red-50",
  害獣: "text-amber-800 bg-amber-100",
  害鳥: "text-blue-800 bg-blue-100",
  施工: "text-orange-700 bg-orange-50",
  建具: "text-[#1e3a5f] bg-slate-100",
  水回り: "text-cyan-700 bg-cyan-50",
  家具: "text-emerald-700 bg-emerald-50",
  家電: "text-purple-700 bg-purple-50",
  その他: "text-slate-600 bg-slate-100",
};

function StampPreview({ type, w, h }: { type: string; w: number; h: number }) {
  const def = STAMP_LIBRARY.find((s) => s.type === type);
  if (!def) return null;
  const maxDim = Math.max(def.defaultWidth, def.defaultHeight);
  const scale = (Math.min(w, h) - 16) / maxDim;
  return (
    <Stage width={w} height={h} listening={false}>
      <Layer>
        <Group x={w / 2} y={h / 2} scaleX={scale} scaleY={scale}>
          <StampGraphic
            stamp={{
              id: "p",
              type: "stamp",
              stampType: def.type,
              position: { x: 0, y: 0 },
              rotation: 0,
              width: def.defaultWidth,
              height: def.defaultHeight,
            }}
          />
        </Group>
      </Layer>
    </Stage>
  );
}

export function StampLibrary() {
  const { activeStamp, setActiveStamp, setTool, tool, recentStamps } = useEditor();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return STAMP_LIBRARY;
    const lower = q.toLowerCase();
    return STAMP_LIBRARY.filter((s) => {
      if (s.label.toLowerCase().includes(lower)) return true;
      if (s.type.toLowerCase().includes(lower)) return true;
      if (s.aliases?.some((a) => a.toLowerCase().includes(lower))) return true;
      return false;
    });
  }, [q]);

  const recentDefs = useMemo(
    () =>
      recentStamps
        .map((t) => STAMP_LIBRARY.find((s) => s.type === t))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, 8),
    [recentStamps],
  );

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden border-l bg-white">
      {/* Search */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-2">
        <div className="text-[11px] font-bold text-[#1e3a5f]">スタンプ</div>
        <div className="mt-1 flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1">
          <Search size={12} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="検索（ゴキブリ・ハチ・トコジラミ等）"
            className="flex-1 min-w-0 bg-transparent text-[11px] outline-none"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-2 pb-3">
        {/* 最近使った（検索中は非表示） */}
        {!q && recentDefs.length > 0 && (
          <div className="space-y-1.5">
            <div className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              最近
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recentDefs.map((s) => (
                <StampTile
                  key={s.type}
                  type={s.type}
                  label={s.label}
                  active={activeStamp === s.type && tool === "stamp"}
                  onClick={() => {
                    setActiveStamp(s.type);
                    if (tool !== "stamp") setTool("stamp");
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {CATEGORY_ORDER.map((cat) => {
          const items = filtered.filter((s) => s.category === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat} className="space-y-1.5">
              <div
                className={cn(
                  "inline-block rounded px-2 py-0.5 text-[10px] font-bold sm:text-[11px]",
                  CATEGORY_COLORS[cat],
                )}
              >
                {cat} ({items.length})
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((s) => (
                  <StampTile
                    key={s.type}
                    type={s.type}
                    label={s.label}
                    active={activeStamp === s.type && tool === "stamp"}
                    onClick={() => {
                      setActiveStamp(s.type);
                      if (tool !== "stamp") setTool("stamp");
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-lg bg-slate-50 p-4 text-center text-[11px] text-slate-500">
            「{q}」に該当するスタンプが見つかりません
          </div>
        )}
      </div>
    </div>
  );
}

function StampTile({
  type,
  label,
  active,
  onClick,
}: {
  type: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center rounded-lg border-2 p-1.5 transition-colors",
        active
          ? "border-[#991b1b] bg-red-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <StampPreview type={type} w={72} h={60} />
      <div className="mt-1 text-center text-[11px] font-semibold leading-tight text-slate-800 sm:text-[12px]">
        {label}
      </div>
    </button>
  );
}
