"use client";

import { Stage, Layer, Group } from "react-konva";
import { STAMP_LIBRARY } from "@/lib/stamps";
import { useEditor } from "@/lib/store";
import { StampGraphic } from "./StampShape";
import { cn } from "@/lib/utils";

const CATEGORIES = ["害虫", "施工", "建具", "水回り", "家具", "家電", "その他"] as const;

const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
  害虫: "text-[#991b1b] bg-red-50",
  施工: "text-amber-700 bg-amber-50",
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
  const { activeStamp, setActiveStamp, setTool, tool } = useEditor();
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto border-l bg-white p-2.5">
      <div className="text-xs font-bold text-[#1e3a5f]">スタンプ</div>
      {CATEGORIES.map((cat) => {
        const items = STAMP_LIBRARY.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-1.5">
            <div
              className={cn(
                "inline-block rounded px-2 py-0.5 text-[10px] font-bold sm:text-[11px]",
                CATEGORY_COLORS[cat],
              )}
            >
              {cat}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((s) => (
                <button
                  key={s.type}
                  onClick={() => {
                    setActiveStamp(s.type);
                    if (tool !== "stamp") setTool("stamp");
                  }}
                  className={cn(
                    "flex flex-col items-center rounded-lg border-2 p-1.5 transition-colors",
                    activeStamp === s.type && tool === "stamp"
                      ? "border-[#991b1b] bg-red-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <StampPreview type={s.type} w={72} h={60} />
                  <div className="mt-1 text-[11px] font-semibold leading-tight text-slate-800 sm:text-[12px]">
                    {s.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
