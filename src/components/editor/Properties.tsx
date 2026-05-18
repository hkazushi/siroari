"use client";

import { useEditor } from "@/lib/store";
import { formatArea, polygonArea } from "@/lib/utils";
import { stampDefOf } from "@/lib/stamps";
import type { AnyElement, Room, Stamp, TextLabel, Wall } from "@/types";

export function Properties() {
  const { elements, selectedIds, updateElement, gridSize, setGridSize } =
    useEditor();
  const selected = elements.filter((e) => selectedIds.includes(e.id));

  if (selected.length === 0) {
    // Show project stats
    const rooms = elements.filter((e): e is Room => e.type === "room");
    const totalArea = rooms.reduce((s, r) => s + polygonArea(r.points), 0);
    const pestCount = elements.filter(
      (e) =>
        e.type === "stamp" &&
        (e.stampType === "pestRoach" ||
          e.stampType === "pestAnt" ||
          e.stampType === "pestRodent" ||
          e.stampType === "pestTermite" ||
          e.stampType === "pestFly"),
    ).length;
    const treatmentCount = elements.filter(
      (e) =>
        e.type === "stamp" &&
        (e.stampType === "baitStation" ||
          e.stampType === "trapMouse" ||
          e.stampType === "trapGlue" ||
          e.stampType === "sprayZone"),
    ).length;
    return (
      <div className="flex h-full w-64 flex-col gap-3 border-l bg-white p-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-slate-500">現場情報</div>
          <div className="mt-1 space-y-1 text-slate-700">
            <div>要素数: {elements.length}</div>
            <div>部屋数: {rooms.length}</div>
            <div>総面積: {formatArea(totalArea)}</div>
            <div className="border-t border-slate-100 pt-1 text-[#991b1b]">
              害虫発見: <span className="font-bold">{pestCount}</span> 箇所
            </div>
            <div className="text-[#1e3a5f]">
              施工記録: <span className="font-bold">{treatmentCount}</span> 箇所
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500">グリッド</div>
          <div className="mt-1">
            <label className="flex items-center gap-2 text-xs">
              <span>サイズ (mm)</span>
              <input
                type="number"
                min={50}
                step={10}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value) || 910)}
                className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs"
              />
            </label>
            <div className="mt-1 text-[10px] text-slate-400">
              標準: 910mm (半間), 455mm (4分の1間)
            </div>
          </div>
        </div>
        <div className="mt-auto text-[10px] text-slate-400">
          要素を選択するとここに詳細が表示されます
        </div>
      </div>
    );
  }

  if (selected.length > 1) {
    return (
      <div className="flex h-full w-64 flex-col gap-3 border-l bg-white p-3 text-sm">
        <div className="text-xs font-semibold text-slate-500">複数選択中</div>
        <div className="text-slate-700">{selected.length} 個の要素</div>
      </div>
    );
  }

  const el = selected[0];
  return (
    <div className="flex h-full w-64 flex-col gap-3 overflow-y-auto border-l bg-white p-3 text-sm">
      <div className="text-xs font-semibold text-slate-500">{labelOf(el)}</div>
      {el.type === "wall" && <WallProps el={el} onChange={(p) => updateElement(el.id, p)} />}
      {el.type === "room" && <RoomProps el={el} onChange={(p) => updateElement(el.id, p)} />}
      {el.type === "stamp" && <StampProps el={el} onChange={(p) => updateElement(el.id, p)} />}
      {el.type === "text" && <TextProps el={el} onChange={(p) => updateElement(el.id, p)} />}
    </div>
  );
}

function labelOf(el: AnyElement) {
  switch (el.type) {
    case "wall":
      return "壁";
    case "room":
      return "部屋";
    case "stamp":
      return stampDefOf(el.stampType).label;
    case "text":
      return "文字";
    case "dimension":
      return "寸法";
  }
}

function NumberRow({
  label,
  value,
  onChange,
  step = 10,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={Math.round(value)}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded border border-slate-200 px-1 py-0.5 text-right text-xs"
        />
        {suffix && <span className="text-[10px] text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function WallProps({ el, onChange }: { el: Wall; onChange: (p: Partial<Wall>) => void }) {
  return (
    <div className="space-y-2">
      <NumberRow
        label="厚さ"
        value={el.thickness}
        suffix="mm"
        onChange={(n) => onChange({ thickness: n })}
      />
      <NumberRow
        label="開始 X"
        value={el.start.x}
        suffix="mm"
        onChange={(n) => onChange({ start: { ...el.start, x: n } })}
      />
      <NumberRow
        label="開始 Y"
        value={el.start.y}
        suffix="mm"
        onChange={(n) => onChange({ start: { ...el.start, y: n } })}
      />
      <NumberRow
        label="終端 X"
        value={el.end.x}
        suffix="mm"
        onChange={(n) => onChange({ end: { ...el.end, x: n } })}
      />
      <NumberRow
        label="終端 Y"
        value={el.end.y}
        suffix="mm"
        onChange={(n) => onChange({ end: { ...el.end, y: n } })}
      />
    </div>
  );
}

function RoomProps({ el, onChange }: { el: Room; onChange: (p: Partial<Room>) => void }) {
  const area = polygonArea(el.points);
  return (
    <div className="space-y-2">
      <label className="block text-xs">
        <div className="mb-1 text-slate-500">名称</div>
        <input
          value={el.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="LDK, 寝室, 洋室..."
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={el.showArea}
          onChange={(e) => onChange({ showArea: e.target.checked })}
        />
        <span>面積表示</span>
      </label>
      <label className="block text-xs">
        <div className="mb-1 text-slate-500">塗りつぶし色</div>
        <input
          type="color"
          value={el.color}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-8 w-full rounded border border-slate-200"
        />
      </label>
      <div className="rounded bg-slate-50 p-2 text-xs">
        <div className="text-slate-500">面積</div>
        <div className="font-semibold text-slate-800">{formatArea(area)}</div>
      </div>
    </div>
  );
}

function StampProps({ el, onChange }: { el: Stamp; onChange: (p: Partial<Stamp>) => void }) {
  return (
    <div className="space-y-2">
      <NumberRow
        label="幅"
        value={el.width}
        suffix="mm"
        onChange={(n) => onChange({ width: Math.max(50, n) })}
      />
      <NumberRow
        label="高さ"
        value={el.height}
        suffix="mm"
        onChange={(n) => onChange({ height: Math.max(50, n) })}
      />
      <NumberRow
        label="X"
        value={el.position.x}
        suffix="mm"
        onChange={(n) => onChange({ position: { ...el.position, x: n } })}
      />
      <NumberRow
        label="Y"
        value={el.position.y}
        suffix="mm"
        onChange={(n) => onChange({ position: { ...el.position, y: n } })}
      />
      <NumberRow
        label="回転"
        value={el.rotation}
        step={15}
        suffix="°"
        onChange={(n) => onChange({ rotation: n })}
      />
    </div>
  );
}

function TextProps({ el, onChange }: { el: TextLabel; onChange: (p: Partial<TextLabel>) => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs">
        <div className="mb-1 text-slate-500">テキスト</div>
        <textarea
          value={el.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={3}
          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
        />
      </label>
      <NumberRow
        label="フォントサイズ"
        value={el.fontSize}
        step={50}
        suffix="mm"
        onChange={(n) => onChange({ fontSize: Math.max(50, n) })}
      />
      <NumberRow
        label="回転"
        value={el.rotation}
        step={15}
        suffix="°"
        onChange={(n) => onChange({ rotation: n })}
      />
    </div>
  );
}
