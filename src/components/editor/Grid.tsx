"use client";

import { Line, Rect } from "react-konva";
import { useEditor } from "@/lib/store";

export function Grid() {
  const { gridSize, scale, offset, paperSize, showGrid } = useEditor();

  // Paper background
  const paperRect = (
    <Rect
      x={offset.x}
      y={offset.y}
      width={paperSize.width * scale}
      height={paperSize.height * scale}
      fill="#ffffff"
      stroke="#94a3b8"
      strokeWidth={1}
      shadowColor="rgba(0,0,0,0.08)"
      shadowBlur={8}
      shadowOffset={{ x: 0, y: 2 }}
      listening={false}
    />
  );

  if (!showGrid) return paperRect;

  const lines: React.ReactNode[] = [];
  const halfGrid = gridSize / 2;

  // sub-grid (every 1/2 grid = 455mm)
  const subStepPx = halfGrid * scale;
  const stepPx = gridSize * scale;
  const startWorldX = 0;
  const startWorldY = 0;
  const endWorldX = paperSize.width;
  const endWorldY = paperSize.height;

  // skip when too dense
  const drawSub = subStepPx > 6;

  if (drawSub) {
    for (let x = startWorldX; x <= endWorldX; x += halfGrid) {
      const isMajor = Math.round(x / gridSize) * gridSize === x;
      lines.push(
        <Line
          key={`vx${x}`}
          points={[
            offset.x + x * scale,
            offset.y,
            offset.x + x * scale,
            offset.y + paperSize.height * scale,
          ]}
          stroke={isMajor ? "#cbd5e1" : "#e2e8f0"}
          strokeWidth={isMajor ? 1 : 0.5}
          listening={false}
        />,
      );
    }
    for (let y = startWorldY; y <= endWorldY; y += halfGrid) {
      const isMajor = Math.round(y / gridSize) * gridSize === y;
      lines.push(
        <Line
          key={`hy${y}`}
          points={[
            offset.x,
            offset.y + y * scale,
            offset.x + paperSize.width * scale,
            offset.y + y * scale,
          ]}
          stroke={isMajor ? "#cbd5e1" : "#e2e8f0"}
          strokeWidth={isMajor ? 1 : 0.5}
          listening={false}
        />,
      );
    }
  } else if (stepPx > 6) {
    for (let x = startWorldX; x <= endWorldX; x += gridSize) {
      lines.push(
        <Line
          key={`vx${x}`}
          points={[
            offset.x + x * scale,
            offset.y,
            offset.x + x * scale,
            offset.y + paperSize.height * scale,
          ]}
          stroke="#cbd5e1"
          strokeWidth={1}
          listening={false}
        />,
      );
    }
    for (let y = startWorldY; y <= endWorldY; y += gridSize) {
      lines.push(
        <Line
          key={`hy${y}`}
          points={[
            offset.x,
            offset.y + y * scale,
            offset.x + paperSize.width * scale,
            offset.y + y * scale,
          ]}
          stroke="#cbd5e1"
          strokeWidth={1}
          listening={false}
        />,
      );
    }
  }

  return (
    <>
      {paperRect}
      {lines}
    </>
  );
}
