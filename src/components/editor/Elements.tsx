"use client";

import { Group, Line, Rect, Text, Circle } from "react-konva";
import { useEditor } from "@/lib/store";
import { formatArea, polygonArea, polygonCentroid, distance } from "@/lib/utils";
import { StampGraphic } from "./StampShape";
import type {
  AnyElement,
  Dimension,
  Room,
  Stamp,
  TextLabel,
  Wall,
} from "@/types";

function worldToCanvasPoints(
  pts: { x: number; y: number }[],
  scale: number,
  offset: { x: number; y: number },
): number[] {
  const out: number[] = [];
  for (const p of pts) {
    out.push(offset.x + p.x * scale, offset.y + p.y * scale);
  }
  return out;
}

function isSelected(id: string, sel: string[]) {
  return sel.includes(id);
}

function WallView({ el }: { el: Wall }) {
  const { scale, offset, selectedIds, tool, toggleSelect, select } = useEditor();
  const selected = isSelected(el.id, selectedIds);
  const px = (p: { x: number; y: number }) => [
    offset.x + p.x * scale,
    offset.y + p.y * scale,
  ];
  const [x1, y1] = px(el.start);
  const [x2, y2] = px(el.end);
  return (
    <Line
      data-element-id={el.id}
      points={[x1, y1, x2, y2]}
      stroke={selected ? "#2563eb" : "#0f172a"}
      strokeWidth={Math.max(2, el.thickness * scale)}
      lineCap="square"
      hitStrokeWidth={Math.max(14, el.thickness * scale + 8)}
      onPointerDown={(e) => {
        if (tool !== "select") return;
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(el.id);
        else select([el.id]);
      }}
    />
  );
}

function RoomView({ el }: { el: Room }) {
  const { scale, offset, selectedIds, tool, toggleSelect, select } = useEditor();
  const selected = isSelected(el.id, selectedIds);
  const flat = worldToCanvasPoints(el.points, scale, offset);
  const area = polygonArea(el.points);
  const c = polygonCentroid(el.points);
  const cx = offset.x + c.x * scale;
  const cy = offset.y + c.y * scale;
  return (
    <Group
      data-element-id={el.id}
      onPointerDown={(e) => {
        if (tool !== "select") return;
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(el.id);
        else select([el.id]);
      }}
    >
      <Line
        points={flat}
        closed
        fill={el.color}
        stroke={selected ? "#2563eb" : "#94a3b8"}
        strokeWidth={selected ? 2 : 1}
        dash={selected ? [] : [6, 4]}
      />
      {el.label ? (
        <Text
          text={el.label}
          x={cx - 200 * scale}
          y={cy - 350 * scale}
          fontSize={Math.max(11, 400 * scale)}
          fill="#0f172a"
          fontStyle="bold"
          listening={false}
        />
      ) : null}
      {el.showArea ? (
        <Text
          text={formatArea(area)}
          x={cx - 700 * scale}
          y={cy + (el.label ? 100 * scale : -150 * scale)}
          fontSize={Math.max(10, 320 * scale)}
          fill="#475569"
          listening={false}
        />
      ) : null}
    </Group>
  );
}

function StampView({ el }: { el: Stamp }) {
  const { scale, offset, selectedIds, tool, toggleSelect, select } = useEditor();
  const selected = isSelected(el.id, selectedIds);
  return (
    <Group
      data-element-id={el.id}
      x={offset.x + el.position.x * scale}
      y={offset.y + el.position.y * scale}
      rotation={el.rotation}
      scaleX={scale}
      scaleY={scale}
      onPointerDown={(e) => {
        if (tool !== "select") return;
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(el.id);
        else select([el.id]);
      }}
    >
      <StampGraphic stamp={el} />
      {selected && (
        <Rect
          x={-el.width / 2 - 50}
          y={-el.height / 2 - 50}
          width={el.width + 100}
          height={el.height + 100}
          stroke="#2563eb"
          strokeWidth={40}
          dash={[120, 80]}
          listening={false}
        />
      )}
    </Group>
  );
}

function TextView({ el }: { el: TextLabel }) {
  const { scale, offset, selectedIds, tool, toggleSelect, select } = useEditor();
  const selected = isSelected(el.id, selectedIds);
  return (
    <Group
      data-element-id={el.id}
      x={offset.x + el.position.x * scale}
      y={offset.y + el.position.y * scale}
      rotation={el.rotation}
      onPointerDown={(e) => {
        if (tool !== "select") return;
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(el.id);
        else select([el.id]);
      }}
    >
      <Text
        text={el.text}
        fontSize={Math.max(10, el.fontSize * scale)}
        fill={selected ? "#2563eb" : "#0f172a"}
      />
    </Group>
  );
}

function DimensionView({ el }: { el: Dimension }) {
  const { scale, offset, selectedIds, tool, toggleSelect, select } = useEditor();
  const selected = isSelected(el.id, selectedIds);
  const dx = el.end.x - el.start.x;
  const dy = el.end.y - el.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const nx = -dy / len;
  const ny = dx / len;
  const off = el.offset;
  const a = { x: el.start.x + nx * off, y: el.start.y + ny * off };
  const b = { x: el.end.x + nx * off, y: el.end.y + ny * off };
  const ax = offset.x + a.x * scale;
  const ay = offset.y + a.y * scale;
  const bx = offset.x + b.x * scale;
  const by = offset.y + b.y * scale;
  const mid = { x: (ax + bx) / 2, y: (ay + by) / 2 };
  // extension lines
  const s1x = offset.x + el.start.x * scale;
  const s1y = offset.y + el.start.y * scale;
  const e1x = offset.x + el.end.x * scale;
  const e1y = offset.y + el.end.y * scale;
  return (
    <Group
      data-element-id={el.id}
      onPointerDown={(e) => {
        if (tool !== "select") return;
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(el.id);
        else select([el.id]);
      }}
    >
      <Line points={[s1x, s1y, ax, ay]} stroke="#64748b" strokeWidth={0.5} />
      <Line points={[e1x, e1y, bx, by]} stroke="#64748b" strokeWidth={0.5} />
      <Line
        points={[ax, ay, bx, by]}
        stroke={selected ? "#2563eb" : "#0f172a"}
        strokeWidth={1}
      />
      <Circle x={ax} y={ay} radius={3} fill={selected ? "#2563eb" : "#0f172a"} />
      <Circle x={bx} y={by} radius={3} fill={selected ? "#2563eb" : "#0f172a"} />
      <Text
        text={`${Math.round(len)}`}
        x={mid.x - 18}
        y={mid.y - 18}
        fontSize={12}
        fill={selected ? "#2563eb" : "#0f172a"}
      />
    </Group>
  );
}

export function ElementsLayer({ elements }: { elements: AnyElement[] }) {
  // Render rooms first, then walls, then stamps, then text/dim
  const rooms = elements.filter((e): e is Room => e.type === "room");
  const walls = elements.filter((e): e is Wall => e.type === "wall");
  const stamps = elements.filter((e): e is Stamp => e.type === "stamp");
  const texts = elements.filter((e): e is TextLabel => e.type === "text");
  const dims = elements.filter((e): e is Dimension => e.type === "dimension");
  return (
    <>
      {rooms.map((r) => (
        <RoomView key={r.id} el={r} />
      ))}
      {walls.map((w) => (
        <WallView key={w.id} el={w} />
      ))}
      {stamps.map((s) => (
        <StampView key={s.id} el={s} />
      ))}
      {dims.map((d) => (
        <DimensionView key={d.id} el={d} />
      ))}
      {texts.map((t) => (
        <TextView key={t.id} el={t} />
      ))}
    </>
  );
}

// Live preview helpers
export { worldToCanvasPoints };
export { distance };
