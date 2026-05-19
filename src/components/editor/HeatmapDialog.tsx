"use client";

import { useEffect, useState } from "react";
import { Stage, Layer, Circle, Line, Rect, Text as KText } from "react-konva";
import { listVisitsBySite } from "@/lib/db";
import { useEditor } from "@/lib/store";
import { DialogShell } from "./Dialogs";
import type { Visit, Room } from "@/types";
import { Flame } from "lucide-react";

import { PEST_STAMP_TYPES } from "@/lib/stamps";
const PEST_TYPES = new Set<string>(PEST_STAMP_TYPES);

export function HeatmapDialog({ onClose }: { onClose: () => void }) {
  const { siteId, paperSize } = useEditor();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!siteId) return;
        const list = await listVisitsBySite(siteId);
        if (cancelled) return;
        setVisits(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  if (!siteId) {
    return (
      <DialogShell title="害虫ヒートマップ" onClose={onClose} size="lg">
        <div className="p-6 text-center text-sm text-slate-600">
          現場が紐付いていないため、時系列比較ができません。
          <br />
          顧客台帳から現場を選んで施工マップを開いてください。
        </div>
      </DialogShell>
    );
  }

  // 各部屋を抽出（直近の visit から）
  const latest = visits[0];
  const rooms = (latest?.elements ?? []).filter(
    (e): e is Room => e.type === "room",
  );

  // 全 visit から害虫スタンプを集める（新しいほど不透明度高）
  type HotPoint = { x: number; y: number; type: string; ageRank: number; visitNo?: number };
  const points: HotPoint[] = [];
  visits.forEach((v, i) => {
    const ageRank = i; // 0 が最新
    for (const el of v.elements) {
      if (el.type === "stamp" && PEST_TYPES.has(el.stampType)) {
        points.push({
          x: el.position.x,
          y: el.position.y,
          type: el.stampType,
          ageRank,
          visitNo: v.visitNumber,
        });
      }
    }
  });

  // 600x420 内に paperSize を収める表示スケール
  const VIEW_W = 600;
  const VIEW_H = 420;
  const sx = (VIEW_W - 20) / paperSize.width;
  const sy = (VIEW_H - 20) / paperSize.height;
  const s = Math.min(sx, sy);
  const ox = (VIEW_W - paperSize.width * s) / 2;
  const oy = (VIEW_H - paperSize.height * s) / 2;

  const colorFor = (type: string) => {
    switch (type) {
      case "pestRoach":
        return "#dc2626";
      case "pestRodent":
        return "#7c3aed";
      case "pestAnt":
        return "#ea580c";
      case "pestTermite":
        return "#ca8a04";
      case "pestFly":
        return "#0891b2";
      default:
        return "#991b1b";
    }
  };

  const counts: Record<string, number> = {};
  points.forEach((p) => {
    counts[p.type] = (counts[p.type] ?? 0) + 1;
  });

  return (
    <DialogShell title="害虫ヒートマップ（過去訪問の重ね合わせ）" onClose={onClose} size="xl">
      <div className="space-y-3 p-4">
        {loading ? (
          <div className="grid h-40 place-items-center text-sm text-slate-500">
            読み込み中...
          </div>
        ) : visits.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
            この現場の訪問記録がまだありません
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <Flame size={14} className="text-[#991b1b]" />
              {visits.length} 回分の訪問を重ね合わせ表示中
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                発見 {points.length} 箇所
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Stage width={VIEW_W} height={VIEW_H}>
                <Layer listening={false}>
                  <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#f8fafc" />
                  <Rect
                    x={ox}
                    y={oy}
                    width={paperSize.width * s}
                    height={paperSize.height * s}
                    fill="#fff"
                    stroke="#cbd5e1"
                  />
                  {/* Rooms outline */}
                  {rooms.map((r) => {
                    const flat: number[] = [];
                    for (const p of r.points)
                      flat.push(ox + p.x * s, oy + p.y * s);
                    return (
                      <Line
                        key={r.id}
                        points={flat}
                        closed
                        fill={r.color}
                        stroke="#94a3b8"
                        strokeWidth={1}
                        opacity={0.4}
                      />
                    );
                  })}
                  {/* Pest hot points */}
                  {points.map((p, i) => {
                    const opacity = Math.max(0.25, 1 - p.ageRank * 0.15);
                    const radius = 8;
                    return (
                      <Circle
                        key={i}
                        x={ox + p.x * s}
                        y={oy + p.y * s}
                        radius={radius}
                        fill={colorFor(p.type)}
                        opacity={opacity}
                        shadowColor={colorFor(p.type)}
                        shadowBlur={radius * 1.5}
                        shadowOpacity={opacity * 0.6}
                      />
                    );
                  })}
                  {/* Room labels (only latest) */}
                  {rooms.map((r) => {
                    if (!r.label) return null;
                    const cx =
                      r.points.reduce((sum, p) => sum + p.x, 0) /
                      r.points.length;
                    const cy =
                      r.points.reduce((sum, p) => sum + p.y, 0) /
                      r.points.length;
                    return (
                      <KText
                        key={r.id}
                        text={r.label}
                        x={ox + cx * s - 30}
                        y={oy + cy * s - 6}
                        fontSize={11}
                        fill="#0f172a"
                        fontStyle="bold"
                      />
                    );
                  })}
                </Layer>
              </Stage>
            </div>
            {/* Legend */}
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-[11px] font-bold text-[#1e3a5f]">凡例 / 集計</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-5">
                {Object.entries(counts).map(([type, c]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: colorFor(type) }}
                    />
                    <span className="text-slate-700">
                      {(
                        {
                          pestRoach: "ゴキブリ",
                          pestRodent: "ネズミ",
                          pestAnt: "アリ",
                          pestTermite: "シロアリ",
                          pestFly: "ハエ・蚊",
                        } as Record<string, string>
                      )[type] ?? type}
                    </span>
                    <span className="ml-auto font-bold text-[#1e3a5f]">
                      {c}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-slate-500">
                ※ 古い訪問ほど透明に表示されます。同じ場所に繰り返し出ている箇所が濃く見えます。
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold text-[#1e3a5f]">
                訪問履歴
              </div>
              <div className="space-y-1 text-[11px]">
                {visits.map((v, i) => {
                  const pestCount = v.elements.filter(
                    (e) => e.type === "stamp" && PEST_TYPES.has(e.stampType),
                  ).length;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded border border-slate-200 px-2 py-1.5"
                    >
                      <span>
                        <strong>第 {v.visitNumber ?? "—"} 回</strong> ／{" "}
                        {v.visitDate
                          ? new Date(v.visitDate).toLocaleDateString("ja-JP")
                          : new Date(v.updatedAt).toLocaleDateString("ja-JP")}
                        {i === 0 && (
                          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                            最新
                          </span>
                        )}
                      </span>
                      <span className="text-[#991b1b]">害虫 {pestCount} 箇所</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DialogShell>
  );
}
