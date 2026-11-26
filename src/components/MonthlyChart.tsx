"use client";

import { useState } from "react";
import { yen } from "@/lib/format";

// 月別 売上・経費の縦棒（2 系列）。色は dataviz の参照パレット slot1/slot2。
const C_REV = "#2a78d6";
const C_EXP = "#eb6834";

function niceMax(v: number): number {
  if (v <= 0) return 100000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function shortYen(v: number): string {
  if (v >= 10000) return `${Math.round(v / 10000).toLocaleString()}万`;
  return v.toLocaleString();
}

/** 4px 角丸の上端・ベースラインは角なしの棒 */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function MonthlyChart({ data }: { data: { month: number; revenue: number; expense: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 240;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.revenue, d.expense))));
  const band = innerW / 12;
  const barW = Math.min(18, (band - 10) / 2);
  const y = (v: number) => pad.t + innerH - (Math.max(0, v) / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_REV }} />
          売上
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_EXP }} />
          経費
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="月別の売上と経費">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={t === 0 ? 1 : 0.5} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#64748b">
              {shortYen(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + band * i + band / 2;
          const x1 = cx - barW - 1;
          const x2 = cx + 1;
          return (
            <g key={d.month}>
              {hover === i && <rect x={pad.l + band * i} y={pad.t} width={band} height={innerH} fill="#f1f5f9" />}
              <path d={barPath(x1, y(d.revenue), barW, y(0) - y(d.revenue))} fill={C_REV} />
              <path d={barPath(x2, y(d.expense), barW, y(0) - y(d.expense))} fill={C_EXP} />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                {d.month}月
              </text>
              {/* ヒット領域は棒より広く */}
              <rect
                x={pad.l + band * i}
                y={pad.t}
                width={band}
                height={innerH + pad.b}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
              />
            </g>
          );
        })}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-6 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
          style={{
            left: `${((pad.l + band * hover + band / 2) / W) * 100}%`,
            transform: hover > 8 ? "translateX(-100%)" : hover < 3 ? "none" : "translateX(-50%)",
          }}
        >
          <div className="mb-1 font-bold text-slate-800">{h.month}月</div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-sm" style={{ background: C_REV }} />
            売上 <span className="ml-auto pl-3 tabular-nums">{yen(h.revenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="h-2 w-2 rounded-sm" style={{ background: C_EXP }} />
            経費 <span className="ml-auto pl-3 tabular-nums">{yen(h.expense)}</span>
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1 text-slate-600">
            差引 <span className="float-right pl-3 tabular-nums">{yen(h.revenue - h.expense)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
