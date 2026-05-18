"use client";

import { Stage, Layer, Group } from "react-konva";
import { STAMP_LIBRARY } from "@/lib/stamps";
import { useEditor } from "@/lib/store";
import { StampGraphic } from "./StampShape";
import { cn } from "@/lib/utils";

const CATEGORIES = ["害虫", "施工", "建具", "水回り", "家具", "家電", "その他"] as const;

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
    <div className="flex h-full flex-col gap-2 overflow-y-auto border-l bg-white p-2">
      <div className="text-xs font-semibold text-slate-500">スタンプ</div>
      {CATEGORIES.map((cat) => {
        const items = STAMP_LIBRARY.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-400">{cat}</div>
            <div className="grid grid-cols-2 gap-1">
              {items.map((s) => (
                <button
                  key={s.type}
                  onClick={() => {
                    setActiveStamp(s.type);
                    if (tool !== "stamp") setTool("stamp");
                  }}
                  className={cn(
                    "flex flex-col items-center rounded border p-1 transition-colors",
                    activeStamp === s.type && tool === "stamp"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <StampPreview type={s.type} w={64} h={56} />
                  <div className="mt-0.5 text-[10px] text-slate-700">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
