"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Line, Rect, Group } from "react-konva";
import type Konva from "konva";
import { useEditor } from "@/lib/store";
import { snap, perpendicularCorrect, distance } from "@/lib/utils";
import { Grid } from "./Grid";
import { ElementsLayer } from "./Elements";
import { StampGraphic } from "./StampShape";
import { stampDefOf } from "@/lib/stamps";
import type { Point } from "@/types";

function useStageSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) => {
        const w = Math.floor(r.width);
        const h = Math.floor(r.height);
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [containerRef]);
  return size;
}

export type CanvasHandle = {
  exportPNG: () => string | null;
  getStage: () => Konva.Stage | null;
};

export function Canvas({
  onReady,
}: {
  onReady?: (h: CanvasHandle) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const size = useStageSize(containerRef);

  const {
    elements,
    scale,
    offset,
    gridSize,
    snapToGrid,
    tool,
    activeStamp,
    draftStart,
    setDraftStart,
    addWall,
    addRoomRect,
    addStamp,
    addText,
    addDimension,
    addSketch,
    deleteElement,
    setStageSize,
    setOffset,
    zoomAt,
    select,
    selectedIds,
    updateElement,
    clearSelection,
  } = useEditor();

  // Hover & drag state
  const [hover, setHover] = useState<Point | null>(null);
  const [boxSelect, setBoxSelect] = useState<{ start: Point; end: Point } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);
  // Pinch
  const pinchRef = useRef<{ d: number; center: Point } | null>(null);
  // Sketch state
  const [sketching, setSketching] = useState(false);
  const [sketchPoints, setSketchPoints] = useState<Point[]>([]);

  useEffect(() => {
    setStageSize(size.width, size.height);
  }, [size.width, size.height, setStageSize]);

  useEffect(() => {
    if (!onReady) return;
    onReady({
      exportPNG: () => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null,
      getStage: () => stageRef.current,
    });
  }, [onReady]);

  // canvas px -> world mm
  const toWorld = useCallback(
    (cx: number, cy: number): Point => ({
      x: (cx - offset.x) / scale,
      y: (cy - offset.y) / scale,
    }),
    [offset.x, offset.y, scale],
  );

  const snapWorld = useCallback(
    (p: Point): Point => {
      if (!snapToGrid) return p;
      const step = gridSize / 2;
      return { x: snap(p.x, step), y: snap(p.y, step) };
    },
    [snapToGrid, gridSize],
  );

  // Wheel zoom
  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const factor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomAt(factor, pointer);
  };

  const onPointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const evt = e.evt;

    // Multi-touch pinch start
    if ((evt as PointerEvent).pointerType === "touch") {
      // handled in container-level touch events
    }

    // Middle mouse or pan tool, or space-held: pan
    const isMiddle = (evt as PointerEvent).button === 1;
    if (tool === "pan" || isMiddle) {
      setIsPanning(true);
      panLastRef.current = { x: pos.x, y: pos.y };
      return;
    }

    const world = snapWorld(toWorld(pos.x, pos.y));

    if (tool === "select") {
      // Did we click on an element? (clicking element bubbles up via element handlers)
      // If empty area, start box select
      const targetName = (e.target as Konva.Node).name?.() ?? "";
      if (e.target === stage || targetName === "background") {
        clearSelection();
        setBoxSelect({ start: world, end: world });
      } else if (selectedIds.length > 0) {
        const id = selectedIds[0];
        setDraggingId(id);
        setDragOffset({ x: world.x, y: world.y });
      }
      return;
    }

    if (tool === "wall") {
      if (!draftStart) {
        setDraftStart(world);
      } else {
        const corrected = perpendicularCorrect(draftStart, world);
        const end = snapWorld(corrected);
        if (distance(draftStart, end) > 50) {
          addWall(draftStart, end);
        }
        setDraftStart(end); // chain walls
      }
      return;
    }

    if (tool === "room") {
      if (!draftStart) {
        setDraftStart(world);
      } else {
        addRoomRect(draftStart, world);
        setDraftStart(null);
      }
      return;
    }

    if (tool === "stamp") {
      addStamp(world, activeStamp, 0);
      return;
    }

    if (tool === "text") {
      const t = window.prompt("テキストを入力", "テキスト");
      if (t && t.trim()) addText(world, t.trim());
      return;
    }

    if (tool === "dimension") {
      if (!draftStart) {
        setDraftStart(world);
      } else {
        addDimension(draftStart, world);
        setDraftStart(null);
      }
      return;
    }

    if (tool === "eraser") {
      // Use intersection
      const shape = stage.getIntersection({ x: pos.x, y: pos.y });
      let node: Konva.Node | null = shape;
      while (node && node !== stage) {
        const id = node.getAttr("data-element-id");
        if (id) {
          deleteElement(id as string);
          break;
        }
        node = node.getParent();
      }
      return;
    }

    if (tool === "sketch") {
      // 手描き開始: スナップせず生の座標を使う
      const raw = toWorld(pos.x, pos.y);
      setSketching(true);
      setSketchPoints([raw]);
      return;
    }
  };

  const onPointerMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const world = snapWorld(toWorld(pos.x, pos.y));
    setHover(world);

    if (isPanning && panLastRef.current) {
      const dx = pos.x - panLastRef.current.x;
      const dy = pos.y - panLastRef.current.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      panLastRef.current = { x: pos.x, y: pos.y };
      return;
    }

    if (boxSelect) {
      setBoxSelect({ start: boxSelect.start, end: world });
      return;
    }

    if (sketching) {
      const raw = toWorld(pos.x, pos.y);
      // 簡易間引き: 直前点と十分離れていれば追加
      const last = sketchPoints[sketchPoints.length - 1];
      if (!last || Math.hypot(raw.x - last.x, raw.y - last.y) > 40) {
        setSketchPoints([...sketchPoints, raw]);
      }
      return;
    }

    if (draggingId) {
      const dx = world.x - dragOffset.x;
      const dy = world.y - dragOffset.y;
      // Move all selected
      for (const id of selectedIds) {
        const el = useEditor.getState().elements.find((x) => x.id === id);
        if (!el) continue;
        if (el.type === "stamp" || el.type === "text") {
          updateElement(id, {
            position: { x: el.position.x + dx, y: el.position.y + dy },
          } as Partial<typeof el>);
        } else if (el.type === "wall") {
          updateElement(id, {
            start: { x: el.start.x + dx, y: el.start.y + dy },
            end: { x: el.end.x + dx, y: el.end.y + dy },
          } as Partial<typeof el>);
        } else if (el.type === "room") {
          updateElement(id, {
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          } as Partial<typeof el>);
        } else if (el.type === "dimension") {
          updateElement(id, {
            start: { x: el.start.x + dx, y: el.start.y + dy },
            end: { x: el.end.x + dx, y: el.end.y + dy },
          } as Partial<typeof el>);
        }
      }
      setDragOffset({ x: world.x, y: world.y });
    }
  };

  const onPointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panLastRef.current = null;
    }
    if (sketching) {
      if (sketchPoints.length >= 2) {
        addSketch(sketchPoints);
      }
      setSketching(false);
      setSketchPoints([]);
    }
    if (boxSelect) {
      // Compute selection
      const { start, end } = boxSelect;
      const x1 = Math.min(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const x2 = Math.max(start.x, end.x);
      const y2 = Math.max(start.y, end.y);
      const ids: string[] = [];
      for (const el of elements) {
        let inside = false;
        if (el.type === "wall") {
          const sIn =
            el.start.x >= x1 && el.start.x <= x2 && el.start.y >= y1 && el.start.y <= y2;
          const eIn = el.end.x >= x1 && el.end.x <= x2 && el.end.y >= y1 && el.end.y <= y2;
          inside = sIn && eIn;
        } else if (el.type === "stamp" || el.type === "text") {
          inside =
            el.position.x >= x1 && el.position.x <= x2 && el.position.y >= y1 && el.position.y <= y2;
        } else if (el.type === "room") {
          inside = el.points.every((p) => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2);
        } else if (el.type === "dimension") {
          inside =
            el.start.x >= x1 &&
            el.start.x <= x2 &&
            el.start.y >= y1 &&
            el.start.y <= y2 &&
            el.end.x >= x1 &&
            el.end.x <= x2 &&
            el.end.y >= y1 &&
            el.end.y <= y2;
        }
        if (inside) ids.push(el.id);
      }
      if (ids.length > 0) select(ids);
      setBoxSelect(null);
    }
    setDraggingId(null);
  };

  // Esc cancels draft
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setDraftStart(null);
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedIds.length > 0) {
        const tag = (ev.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        ev.preventDefault();
        useEditor.getState().deleteSelected();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) useEditor.getState().redo();
        else useEditor.getState().undo();
      }
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        useEditor.getState().redo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedIds.length, setDraftStart]);

  // Touch pinch zoom (two-finger)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = el.getBoundingClientRect();
      const center = {
        x: (a.clientX + b.clientX) / 2 - rect.left,
        y: (a.clientY + b.clientY) / 2 - rect.top,
      };
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (!pinchRef.current) {
        pinchRef.current = { d, center };
        return;
      }
      const factor = d / pinchRef.current.d;
      if (Math.abs(factor - 1) > 0.01) {
        zoomAt(factor, center);
        pinchRef.current = { d, center };
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoomAt]);

  // Render draft preview
  const renderDraft = () => {
    if (!hover) return null;
    if (tool === "wall" && draftStart) {
      const corrected = snapWorld(perpendicularCorrect(draftStart, hover));
      return (
        <Line
          points={[
            offset.x + draftStart.x * scale,
            offset.y + draftStart.y * scale,
            offset.x + corrected.x * scale,
            offset.y + corrected.y * scale,
          ]}
          stroke="#2563eb"
          strokeWidth={6}
          dash={[8, 6]}
          listening={false}
        />
      );
    }
    if (tool === "room" && draftStart) {
      const x = Math.min(draftStart.x, hover.x);
      const y = Math.min(draftStart.y, hover.y);
      const w = Math.abs(hover.x - draftStart.x);
      const h = Math.abs(hover.y - draftStart.y);
      return (
        <Rect
          x={offset.x + x * scale}
          y={offset.y + y * scale}
          width={w * scale}
          height={h * scale}
          fill="rgba(37, 99, 235, 0.08)"
          stroke="#2563eb"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      );
    }
    if (tool === "dimension" && draftStart) {
      return (
        <Line
          points={[
            offset.x + draftStart.x * scale,
            offset.y + draftStart.y * scale,
            offset.x + hover.x * scale,
            offset.y + hover.y * scale,
          ]}
          stroke="#2563eb"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
        />
      );
    }
    if (tool === "stamp") {
      const def = stampDefOf(activeStamp);
      return (
        <Group
          x={offset.x + hover.x * scale}
          y={offset.y + hover.y * scale}
          scaleX={scale}
          scaleY={scale}
          opacity={0.5}
          listening={false}
        >
          <StampGraphic
            stamp={{
              id: "preview",
              type: "stamp",
              stampType: activeStamp,
              position: { x: 0, y: 0 },
              rotation: 0,
              width: def.defaultWidth,
              height: def.defaultHeight,
            }}
          />
        </Group>
      );
    }
    if (tool === "sketch" && sketching && sketchPoints.length >= 2) {
      const flat: number[] = [];
      for (const p of sketchPoints) {
        flat.push(offset.x + p.x * scale, offset.y + p.y * scale);
      }
      return (
        <Line
          points={flat}
          stroke="#991b1b"
          strokeWidth={Math.max(2, 60 * scale)}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          opacity={0.85}
          listening={false}
        />
      );
    }
    return null;
  };

  // Box select rect (canvas px)
  const renderBoxSelect = () => {
    if (!boxSelect) return null;
    const { start, end } = boxSelect;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    return (
      <Rect
        x={offset.x + x * scale}
        y={offset.y + y * scale}
        width={w * scale}
        height={h * scale}
        fill="rgba(37, 99, 235, 0.08)"
        stroke="#2563eb"
        strokeWidth={1}
        dash={[6, 4]}
        listening={false}
      />
    );
  };

  // Cursor coordinate display
  const cursorInfo =
    hover &&
    `X: ${Math.round(hover.x)}mm  Y: ${Math.round(hover.y)}mm  |  ${Math.round(
      1 / scale,
    )}x  |  scale ${(scale * 100).toFixed(1)}%`;

  // Background rect to catch background events
  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-100 select-none"
      style={{ touchAction: "none" }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <Layer listening>
          {/* background catcher */}
          <Rect
            name="background"
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill="#f1f5f9"
            listening
          />
          <Grid />
        </Layer>
        <Layer>
          <ElementsLayer elements={elements} />
          {renderDraft()}
          {renderBoxSelect()}
        </Layer>
      </Stage>
      {cursorInfo && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-slate-700 shadow">
          {cursorInfo}
        </div>
      )}
    </div>
  );
}
