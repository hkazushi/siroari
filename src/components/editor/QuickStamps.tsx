"use client";

import { Stage, Layer, Group } from "react-konva";
import { useEditor } from "@/lib/store";
import { StampGraphic } from "./StampShape";
import { STAMP_LIBRARY } from "@/lib/stamps";
import { cn } from "@/lib/utils";

export function QuickStamps() {
  const { recentStamps, activeStamp, setActiveStamp, setTool, tool } =
    useEditor();
  if (recentStamps.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur">
        <div className="px-1 text-[9px] font-bold text-slate-400">
          最近
        </div>
        {recentStamps.map((t) => {
          const def = STAMP_LIBRARY.find((s) => s.type === t);
          if (!def) return null;
          const isActive = activeStamp === t && tool === "stamp";
          return (
            <button
              key={t}
              onClick={() => {
                setActiveStamp(t);
                if (tool !== "stamp") setTool("stamp");
              }}
              className={cn(
                "rounded-full p-0.5 transition-colors",
                isActive
                  ? "bg-[#991b1b] ring-2 ring-[#991b1b] ring-offset-1"
                  : "hover:bg-slate-100",
              )}
              title={def.label}
            >
              <MiniStamp type={t} active={isActive} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniStamp({
  type,
  active,
}: {
  type: import("@/types").StampType;
  active: boolean;
}) {
  const def = STAMP_LIBRARY.find((s) => s.type === type);
  if (!def) return null;
  const maxDim = Math.max(def.defaultWidth, def.defaultHeight);
  const scale = 32 / maxDim;
  return (
    <Stage width={36} height={36} listening={false}>
      <Layer>
        <Group x={18} y={18} scaleX={scale} scaleY={scale} opacity={active ? 1 : 0.85}>
          <StampGraphic
            stamp={{
              id: "m",
              type: "stamp",
              stampType: type,
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
