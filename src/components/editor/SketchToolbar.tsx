"use client";

import { useEditor } from "@/lib/store";
import { Eraser, Trash2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "#991b1b", label: "赤" },
  { value: "#1e3a5f", label: "紺" },
  { value: "#0f172a", label: "黒" },
  { value: "#059669", label: "緑" },
  { value: "#7c3aed", label: "紫" },
  { value: "#ea580c", label: "橙" },
];
const THICKNESSES = [
  { value: 40, label: "細", icon: 4 },
  { value: 80, label: "中", icon: 7 },
  { value: 140, label: "太", icon: 10 },
];

export function SketchToolbar({
  onAIClean,
}: {
  onAIClean: () => void;
}) {
  const {
    tool,
    setTool,
    sketchColor,
    setSketchColor,
    sketchThickness,
    setSketchThickness,
    sketchEraser,
    setSketchEraser,
    elements,
    removeAllSketches,
  } = useEditor();

  if (tool !== "sketch") return null;
  const sketchCount = elements.filter((e) => e.type === "sketch").length;

  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur sm:gap-3 sm:px-3 sm:py-2">
      <div className="hidden text-[10px] font-bold tracking-wide text-[#991b1b] sm:block">
        ✍️ 手描き
      </div>

      {/* Colors */}
      <div className="flex items-center gap-0.5">
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setSketchColor(c.value);
              if (sketchEraser) setSketchEraser(false);
            }}
            title={c.label}
            className={cn(
              "h-6 w-6 rounded-full transition-transform",
              sketchColor === c.value && !sketchEraser
                ? "scale-110 ring-2 ring-offset-1 ring-slate-500"
                : "hover:scale-105",
            )}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* Thickness */}
      <div className="flex items-center gap-0.5">
        {THICKNESSES.map((t) => (
          <button
            key={t.value}
            onClick={() => setSketchThickness(t.value)}
            title={t.label}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full hover:bg-slate-100",
              sketchThickness === t.value && "bg-slate-200",
            )}
          >
            <div
              className="rounded-full bg-slate-700"
              style={{ width: t.icon, height: t.icon }}
            />
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {/* Eraser toggle within sketch mode */}
      <button
        onClick={() => setSketchEraser(!sketchEraser)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
          sketchEraser
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        )}
        title="消しゴム（描いた手描き線を消す）"
      >
        <Eraser size={12} /> 消す
      </button>

      {/* Clear all sketches */}
      {sketchCount > 0 && (
        <button
          onClick={() => {
            if (confirm(`手描き ${sketchCount} 個を一括削除しますか？`)) {
              removeAllSketches();
            }
          }}
          className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
          title="手描きをすべて削除"
        >
          <Trash2 size={12} /> 全消去
        </button>
      )}

      {/* AI 整形 - prominent when sketches exist */}
      {sketchCount > 0 && (
        <button
          onClick={onAIClean}
          className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:from-amber-600 hover:to-rose-600"
          title="手描きを AI で整形して間取りに変換"
        >
          <Sparkles size={12} /> AI で整形（{sketchCount}）
        </button>
      )}

      {/* Exit sketch mode */}
      <button
        onClick={() => setTool("select")}
        className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
        title="手描きモード終了"
      >
        <X size={14} />
      </button>
    </div>
  );
}
