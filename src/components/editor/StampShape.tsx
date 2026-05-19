"use client";

import { Group, Line, Rect, Circle, Arc, Ellipse, Text } from "react-konva";
import type { Stamp } from "@/types";

// Render a stamp in *world* (mm) coordinates centered at (0,0).
// The parent Group is positioned & scaled appropriately.
export function StampGraphic({ stamp }: { stamp: Stamp }) {
  const w = stamp.width;
  const h = stamp.height;
  const hx = w / 2;
  const hy = h / 2;

  const stroke = "#1e293b";
  const sw = 30; // 30mm visual stroke - scaled with world

  switch (stamp.stampType) {
    case "door":
      return (
        <Group>
          {/* doorway opening */}
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          {/* door leaf (arc) */}
          <Arc
            x={-hx}
            y={hy}
            innerRadius={0}
            outerRadius={w}
            angle={90}
            rotation={-90}
            stroke={stroke}
            strokeWidth={sw}
          />
          <Line points={[-hx, hy, -hx + w, hy]} stroke={stroke} strokeWidth={sw} />
        </Group>
      );
    case "doorSliding":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Line points={[-hx, 0, hx, 0]} stroke={stroke} strokeWidth={sw} dash={[80, 60]} />
        </Group>
      );
    case "window":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Line points={[-hx, 0, hx, 0]} stroke={stroke} strokeWidth={sw} />
          <Line points={[-hx, -hy / 2, hx, -hy / 2]} stroke={stroke} strokeWidth={sw / 2} />
          <Line points={[-hx, hy / 2, hx, hy / 2]} stroke={stroke} strokeWidth={sw / 2} />
        </Group>
      );
    case "stairs": {
      const steps = 10;
      const stepLines = [];
      for (let i = 1; i < steps; i++) {
        const y = -hy + (h * i) / steps;
        stepLines.push(<Line key={i} points={[-hx, y, hx, y]} stroke={stroke} strokeWidth={sw} />);
      }
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw * 1.2} fillEnabled={false} />
          {stepLines}
          {/* arrow up */}
          <Line points={[0, hy - 200, 0, -hy + 300]} stroke={stroke} strokeWidth={sw} />
          <Line points={[0, -hy + 300, -200, -hy + 500]} stroke={stroke} strokeWidth={sw} />
          <Line points={[0, -hy + 300, 200, -hy + 500]} stroke={stroke} strokeWidth={sw} />
          <Text text="UP" x={-hx + 100} y={hy - 500} fontSize={300} fill={stroke} />
        </Group>
      );
    }
    case "toilet":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h * 0.35} cornerRadius={50} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Rect x={-hx + 50} y={-hy + h * 0.35} width={w - 100} height={h * 0.6} cornerRadius={200} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
        </Group>
      );
    case "bath":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} cornerRadius={200} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Rect x={-hx + 100} y={-hy + 100} width={w - 200} height={h - 200} cornerRadius={150} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
        </Group>
      );
    case "sink":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Rect x={-hx + 120} y={-hy + 80} width={w - 240} height={h - 200} cornerRadius={80} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Circle x={0} y={hy - 100} radius={50} stroke={stroke} strokeWidth={sw / 2} />
        </Group>
      );
    case "kitchen":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          {/* sink */}
          <Rect x={-hx + 200} y={-hy + 80} width={600} height={h - 160} stroke={stroke} strokeWidth={sw / 1.5} fillEnabled={false} />
          {/* stove burners */}
          <Circle x={hx - 500} y={0} radius={120} stroke={stroke} strokeWidth={sw / 2} />
          <Circle x={hx - 200} y={0} radius={120} stroke={stroke} strokeWidth={sw / 2} />
        </Group>
      );
    case "washer":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Circle x={0} y={0} radius={Math.min(w, h) * 0.35} stroke={stroke} strokeWidth={sw / 1.5} />
          <Text text="洗" x={-150} y={-150} fontSize={300} fill={stroke} />
        </Group>
      );
    case "bed":
    case "bedDouble":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} cornerRadius={50} stroke={stroke} strokeWidth={sw} fillEnabled={false} fill="#f8fafc" />
          {/* pillow(s) */}
          {stamp.stampType === "bed" ? (
            <Rect x={-hx + 100} y={-hy + 80} width={w - 200} height={300} cornerRadius={40} stroke={stroke} strokeWidth={sw / 1.5} fillEnabled={false} />
          ) : (
            <>
              <Rect x={-hx + 100} y={-hy + 80} width={(w - 300) / 2} height={300} cornerRadius={40} stroke={stroke} strokeWidth={sw / 1.5} fillEnabled={false} />
              <Rect x={100} y={-hy + 80} width={(w - 300) / 2} height={300} cornerRadius={40} stroke={stroke} strokeWidth={sw / 1.5} fillEnabled={false} />
            </>
          )}
        </Group>
      );
    case "sofa":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} cornerRadius={150} stroke={stroke} strokeWidth={sw} fillEnabled={false} fill="#f8fafc" />
          <Rect x={-hx + 80} y={-hy + 80} width={w - 160} height={h - 300} cornerRadius={100} stroke={stroke} strokeWidth={sw / 1.5} fillEnabled={false} />
        </Group>
      );
    case "table":
    case "desk":
      return (
        <Rect x={-hx} y={-hy} width={w} height={h} cornerRadius={50} stroke={stroke} strokeWidth={sw} fillEnabled={false} fill="#f8fafc" />
      );
    case "chair":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} cornerRadius={80} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
        </Group>
      );
    case "tv":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fill="#1e293b" />
        </Group>
      );
    case "fridge":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Line points={[-hx, -hy + h * 0.35, hx, -hy + h * 0.35]} stroke={stroke} strokeWidth={sw / 1.5} />
        </Group>
      );
    case "closet":
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />
          <Line points={[-hx, hy, hx, -hy]} stroke={stroke} strokeWidth={sw / 1.5} dash={[80, 60]} />
        </Group>
      );
    // ===== Pest control specific =====
    case "pestRoach": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fee2e2" stroke="#991b1b" strokeWidth={sw} />
          {/* body */}
          <Ellipse x={0} y={0} radiusX={r * 0.45} radiusY={r * 0.7} fill="#7c2d12" stroke="#1e293b" strokeWidth={sw / 2} />
          {/* antennae */}
          <Line points={[-r * 0.2, -r * 0.65, -r * 0.5, -r * 1.0]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[r * 0.2, -r * 0.65, r * 0.5, -r * 1.0]} stroke="#1e293b" strokeWidth={sw / 2} />
          {/* legs */}
          <Line points={[-r * 0.4, -r * 0.2, -r * 0.85, -r * 0.2]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[-r * 0.4, 0, -r * 0.85, 0]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[-r * 0.4, r * 0.2, -r * 0.85, r * 0.2]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[r * 0.4, -r * 0.2, r * 0.85, -r * 0.2]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[r * 0.4, 0, r * 0.85, 0]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[r * 0.4, r * 0.2, r * 0.85, r * 0.2]} stroke="#1e293b" strokeWidth={sw / 2} />
        </Group>
      );
    }
    case "pestAnt": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fee2e2" stroke="#991b1b" strokeWidth={sw} />
          <Circle x={0} y={-r * 0.5} radius={r * 0.18} fill="#1e293b" />
          <Circle x={0} y={-r * 0.15} radius={r * 0.22} fill="#1e293b" />
          <Circle x={0} y={r * 0.3} radius={r * 0.28} fill="#1e293b" />
          <Line points={[-r * 0.1, -r * 0.65, -r * 0.4, -r * 0.95]} stroke="#1e293b" strokeWidth={sw / 2} />
          <Line points={[r * 0.1, -r * 0.65, r * 0.4, -r * 0.95]} stroke="#1e293b" strokeWidth={sw / 2} />
        </Group>
      );
    }
    case "pestRodent": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fee2e2" stroke="#991b1b" strokeWidth={sw} />
          <Ellipse x={0} y={r * 0.1} radiusX={r * 0.55} radiusY={r * 0.4} fill="#475569" stroke="#1e293b" strokeWidth={sw / 2} />
          <Circle x={0} y={-r * 0.35} radius={r * 0.25} fill="#475569" stroke="#1e293b" strokeWidth={sw / 2} />
          <Circle x={-r * 0.2} y={-r * 0.55} radius={r * 0.12} fill="#475569" stroke="#1e293b" strokeWidth={sw / 2} />
          <Circle x={r * 0.2} y={-r * 0.55} radius={r * 0.12} fill="#475569" stroke="#1e293b" strokeWidth={sw / 2} />
          {/* tail */}
          <Line points={[r * 0.5, r * 0.3, r * 0.95, r * 0.45]} stroke="#1e293b" strokeWidth={sw / 2} />
        </Group>
      );
    }
    case "pestTermite": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fef3c7" stroke="#991b1b" strokeWidth={sw} />
          <Ellipse x={0} y={0} radiusX={r * 0.35} radiusY={r * 0.55} fill="#fbbf24" stroke="#92400e" strokeWidth={sw / 2} />
          <Circle x={0} y={-r * 0.55} radius={r * 0.2} fill="#92400e" />
          <Line points={[-r * 0.3, -r * 0.4, -r * 0.6, -r * 0.55]} stroke="#92400e" strokeWidth={sw / 2} />
          <Line points={[r * 0.3, -r * 0.4, r * 0.6, -r * 0.55]} stroke="#92400e" strokeWidth={sw / 2} />
        </Group>
      );
    }
    case "pestFly": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fee2e2" stroke="#991b1b" strokeWidth={sw} />
          <Ellipse x={0} y={0} radiusX={r * 0.3} radiusY={r * 0.45} fill="#1e293b" />
          <Ellipse x={-r * 0.5} y={-r * 0.1} radiusX={r * 0.3} radiusY={r * 0.18} fill="#cbd5e1" stroke="#1e293b" strokeWidth={sw / 2} opacity={0.7} />
          <Ellipse x={r * 0.5} y={-r * 0.1} radiusX={r * 0.3} radiusY={r * 0.18} fill="#cbd5e1" stroke="#1e293b" strokeWidth={sw / 2} opacity={0.7} />
          <Circle x={-r * 0.1} y={-r * 0.45} radius={r * 0.08} fill="#dc2626" />
          <Circle x={r * 0.1} y={-r * 0.45} radius={r * 0.08} fill="#dc2626" />
        </Group>
      );
    }
    case "baitStation": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Rect x={-r} y={-r} width={r * 2} height={r * 2} cornerRadius={r * 0.3} fill="#fef9c3" stroke="#92400e" strokeWidth={sw} />
          <Circle x={0} y={0} radius={r * 0.45} fill="#92400e" />
          <Text text="毒" x={-r * 0.45} y={-r * 0.5} fontSize={r * 0.9} fill="#fff" fontStyle="bold" />
        </Group>
      );
    }
    case "trapMouse": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Rect x={-r} y={-r * 0.6} width={r * 2} height={r * 1.2} cornerRadius={sw} fill="#fed7aa" stroke="#7c2d12" strokeWidth={sw} />
          <Rect x={-r * 0.85} y={-r * 0.45} width={r * 1.7} height={r * 0.9} fill="none" stroke="#7c2d12" strokeWidth={sw / 1.5} />
          <Line points={[-r * 0.85, -r * 0.45, r * 0.85, r * 0.45]} stroke="#7c2d12" strokeWidth={sw / 1.5} />
          <Circle x={r * 0.5} y={0} radius={r * 0.18} fill="#fbbf24" stroke="#7c2d12" strokeWidth={sw / 2} />
        </Group>
      );
    }
    case "trapGlue": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Rect x={-r} y={-r * 0.6} width={r * 2} height={r * 1.2} cornerRadius={sw} fill="#fde68a" stroke="#a16207" strokeWidth={sw} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Line
              key={i}
              points={[-r + i * (r * 2 / 4), -r * 0.6, -r + i * (r * 2 / 4) + r * 0.5, r * 0.6]}
              stroke="#a16207"
              strokeWidth={sw / 2}
              dash={[40, 30]}
            />
          ))}
          <Text text="粘" x={-r * 0.3} y={-r * 0.25} fontSize={r * 0.55} fill="#7c2d12" fontStyle="bold" />
        </Group>
      );
    }
    case "sprayZone": {
      return (
        <Group>
          <Rect
            x={-hx}
            y={-hy}
            width={w}
            height={h}
            fill="rgba(34, 197, 94, 0.15)"
            stroke="#15803d"
            strokeWidth={sw}
            dash={[120, 80]}
          />
          <Text text="薬剤" x={-hx + 80} y={-hy + 80} fontSize={300} fill="#15803d" fontStyle="bold" />
        </Group>
      );
    }
    case "entryPoint": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fef9c3" stroke="#a16207" strokeWidth={sw} />
          {/* arrow pointing inward */}
          <Line points={[-r * 0.7, -r * 0.7, 0, 0]} stroke="#a16207" strokeWidth={sw} />
          <Line points={[0, 0, -r * 0.2, -r * 0.5]} stroke="#a16207" strokeWidth={sw} />
          <Line points={[0, 0, -r * 0.5, -r * 0.2]} stroke="#a16207" strokeWidth={sw} />
          <Circle x={r * 0.25} y={r * 0.25} radius={r * 0.18} fill="#a16207" />
        </Group>
      );
    }
    case "crack": {
      return (
        <Group>
          <Line
            points={[-hx, 0, -hx * 0.5, -hy * 0.3, 0, hy * 0.2, hx * 0.5, -hy * 0.2, hx, 0]}
            stroke="#991b1b"
            strokeWidth={sw * 1.5}
          />
        </Group>
      );
    }
    case "nest": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#fed7aa" stroke="#7c2d12" strokeWidth={sw} />
          {/* concentric circles like a hive */}
          <Circle x={0} y={0} radius={r * 0.7} fill="none" stroke="#7c2d12" strokeWidth={sw / 2} />
          <Circle x={0} y={0} radius={r * 0.4} fill="none" stroke="#7c2d12" strokeWidth={sw / 2} />
          <Text text="巣" x={-r * 0.3} y={-r * 0.35} fontSize={r * 0.7} fill="#7c2d12" fontStyle="bold" />
        </Group>
      );
    }
    case "moisture": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Circle x={0} y={0} radius={r} fill="#dbeafe" stroke="#1d4ed8" strokeWidth={sw} />
          {/* water drop */}
          <Line
            points={[0, -r * 0.6, -r * 0.4, r * 0.2, 0, r * 0.6, r * 0.4, r * 0.2, 0, -r * 0.6]}
            closed
            fill="#1d4ed8"
            stroke="#1d4ed8"
            strokeWidth={sw / 2}
          />
        </Group>
      );
    }
    // ===== 害虫（汎用バッジ） =====
    case "pestMosquito":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#854d0e" text="蚊" textColor="#78350f" />;
    case "pestBee":
      return <PestBadge w={w} h={h} bg="#fef9c3" border="#a16207" text="蜂" textColor="#713f12" stripes />;
    case "pestSpider":
      return <PestBadge w={w} h={h} bg="#f3e8ff" border="#6b21a8" text="蜘" textColor="#581c87" />;
    case "pestCentipede":
      return <PestBadge w={w} h={h} bg="#fed7aa" border="#9a3412" text="百" textColor="#7c2d12" />;
    case "pestMillipede":
      return <PestBadge w={w} h={h} bg="#e7e5e4" border="#57534e" text="馬" textColor="#292524" />;
    case "pestHouseCentipede":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#a16207" text="蚰" textColor="#713f12" />;
    case "pestBedbug":
      return <PestBadge w={w} h={h} bg="#fee2e2" border="#9f1239" text="床" textColor="#881337" />;
    case "pestMite":
      return <PestBadge w={w} h={h} bg="#fef2f2" border="#7f1d1d" text="ダ" textColor="#7f1d1d" />;
    case "pestFlea":
      return <PestBadge w={w} h={h} bg="#fed7aa" border="#7c2d12" text="蚤" textColor="#7c2d12" />;
    case "pestSilverfish":
      return <PestBadge w={w} h={h} bg="#e0f2fe" border="#0c4a6e" text="紙" textColor="#0c4a6e" />;
    case "pestStinkbug":
      return <PestBadge w={w} h={h} bg="#dcfce7" border="#14532d" text="亀" textColor="#14532d" />;
    case "pestMoth":
      return <PestBadge w={w} h={h} bg="#fdf4ff" border="#86198f" text="蛾" textColor="#701a75" />;
    case "pestDrainFly":
      return <PestBadge w={w} h={h} bg="#cffafe" border="#155e75" text="蝶" textColor="#164e63" />;
    case "pestEarwig":
      return <PestBadge w={w} h={h} bg="#fde68a" border="#854d0e" text="鋏" textColor="#78350f" />;
    case "pestWeevil":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#92400e" text="穀" textColor="#78350f" />;

    // ===== 害獣（茶系バッジ + 動物名漢字） =====
    case "pestRat":
      return <PestBadge w={w} h={h} bg="#fafaf9" border="#44403c" text="鼠" textColor="#1c1917" />;
    case "pestMouse":
      return <PestBadge w={w} h={h} bg="#fafafa" border="#6b7280" text="鼠" textColor="#374151" />;
    case "pestWeasel":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#92400e" text="鼬" textColor="#7c2d12" />;
    case "pestCivet":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#78350f" text="白" textColor="#451a03" />;
    case "pestRaccoon":
      return <PestBadge w={w} h={h} bg="#e7e5e4" border="#44403c" text="洗" textColor="#1c1917" />;
    case "pestRaccoonDog":
      return <PestBadge w={w} h={h} bg="#fed7aa" border="#7c2d12" text="狸" textColor="#451a03" />;
    case "pestBat":
      return <PestBadge w={w} h={h} bg="#1f2937" border="#000" text="蝙" textColor="#fef3c7" />;
    case "pestSnake":
      return <PestBadge w={w} h={h} bg="#dcfce7" border="#14532d" text="蛇" textColor="#14532d" />;
    case "pestStrayCat":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#854d0e" text="猫" textColor="#78350f" />;

    // ===== 害鳥（青空系） =====
    case "pestPigeon":
      return <PestBadge w={w} h={h} bg="#e0e7ff" border="#1e40af" text="鳩" textColor="#1e3a8a" />;
    case "pestSparrow":
      return <PestBadge w={w} h={h} bg="#fef3c7" border="#a16207" text="雀" textColor="#713f12" />;
    case "pestCrow":
      return <PestBadge w={w} h={h} bg="#1e293b" border="#000" text="烏" textColor="#fde68a" />;
    case "pestStarling":
      return <PestBadge w={w} h={h} bg="#e0e7ff" border="#3730a3" text="椋" textColor="#312e81" />;
    case "pestSwallow":
      return <PestBadge w={w} h={h} bg="#dbeafe" border="#1e40af" text="燕" textColor="#1e3a8a" />;

    // ===== 追加施工 =====
    case "fumigation": {
      const r = Math.min(w, h) / 2;
      return (
        <Group>
          <Rect x={-hx} y={-hy} width={w} height={h} fill="#f3e8ff" stroke="#6b21a8" strokeWidth={sw} dash={[60, 40]} cornerRadius={50} />
          <Text text="燻煙" x={-r * 0.5} y={-r * 0.2} fontSize={r * 0.5} fontStyle="bold" fill="#6b21a8" />
        </Group>
      );
    }
    case "uvTrap":
      return <PestBadge w={w} h={h} bg="#ede9fe" border="#6d28d9" text="UV" textColor="#5b21b6" />;
    case "ultrasonic":
      return <PestBadge w={w} h={h} bg="#dbeafe" border="#1e40af" text="音" textColor="#1e3a8a" />;

    default:
      return <Rect x={-hx} y={-hy} width={w} height={h} stroke={stroke} strokeWidth={sw} fillEnabled={false} />;
  }
}

/**
 * 共通バッジ（円 + 太い枠 + 中央の漢字 1〜2 文字）。
 * 害虫害獣の新規スタンプ用。
 */
function PestBadge({
  w,
  h,
  bg,
  border,
  text,
  textColor,
  stripes,
}: {
  w: number;
  h: number;
  bg: string;
  border: string;
  text: string;
  textColor: string;
  stripes?: boolean;
}) {
  const r = Math.min(w, h) / 2;
  const sw = 30;
  const charLen = text.length;
  const fontSize = charLen > 1 ? r * 0.7 : r * 1.1;
  return (
    <Group>
      <Circle x={0} y={0} radius={r} fill={bg} stroke={border} strokeWidth={sw} />
      {stripes && (
        <>
          <Line
            points={[-r * 0.7, -r * 0.4, r * 0.7, -r * 0.4]}
            stroke={border}
            strokeWidth={sw / 1.5}
          />
          <Line
            points={[-r * 0.7, 0, r * 0.7, 0]}
            stroke={border}
            strokeWidth={sw / 1.5}
          />
          <Line
            points={[-r * 0.7, r * 0.4, r * 0.7, r * 0.4]}
            stroke={border}
            strokeWidth={sw / 1.5}
          />
        </>
      )}
      <Text
        text={text}
        x={-fontSize * 0.5 * charLen}
        y={-fontSize * 0.55}
        fontSize={fontSize}
        fontStyle="bold"
        fill={textColor}
      />
    </Group>
  );
}
