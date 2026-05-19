"use client";

import { useEditor } from "@/lib/store";

/** 方位コンパス（モバイルは右上に小さく、デスクトップは左上に大きく） */
export function CompassOverlay() {
  const { showCompass } = useEditor();
  if (!showCompass) return null;
  return (
    <div className="pointer-events-none absolute right-3 top-12 z-10 sm:left-3 sm:right-auto sm:top-3">
      <svg
        viewBox="0 0 56 56"
        className="h-9 w-9 sm:h-14 sm:w-14"
      >
        <circle cx="28" cy="28" r="25" fill="rgba(255,255,255,0.9)" stroke="#1e3a5f" strokeWidth="1.5" />
        <polygon points="28,6 24,28 28,24 32,28" fill="#991b1b" stroke="#991b1b" strokeWidth="1" />
        <polygon points="28,50 24,28 28,32 32,28" fill="#fff" stroke="#1e3a5f" strokeWidth="1" />
        <text x="28" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#991b1b">
          N
        </text>
        <text x="28" y="48" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e3a5f">
          S
        </text>
        <text x="6" y="31" fontSize="8" fontWeight="700" fill="#1e3a5f">
          W
        </text>
        <text x="46" y="31" fontSize="8" fontWeight="700" fill="#1e3a5f">
          E
        </text>
      </svg>
    </div>
  );
}

/** 縮尺バー（右下、現在のズーム/グリッドサイズに合わせて表示） */
export function ScaleBarOverlay() {
  const { showScaleBar, scale } = useEditor();
  if (!showScaleBar) return null;
  // 1m が現在のスケールで何ピクセルか
  const pxPerMeter = 1000 * scale;
  // ピクセル幅で 60〜180px に収まる「きれいな数値」を探す
  const candidates = [
    { m: 0.5, px: 500 * scale },
    { m: 1, px: 1000 * scale },
    { m: 2, px: 2000 * scale },
    { m: 5, px: 5000 * scale },
    { m: 10, px: 10000 * scale },
  ];
  // 60–180px に近いものを採用
  const chosen =
    candidates.find((c) => c.px >= 60 && c.px <= 180) ??
    candidates.reduce((a, b) =>
      Math.abs(b.px - 120) < Math.abs(a.px - 120) ? b : a,
    );
  if (!Number.isFinite(pxPerMeter)) return null;
  return (
    <div className="pointer-events-none absolute bottom-12 right-3 z-10 rounded bg-white/95 px-2 py-1 shadow">
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 flex-col items-stretch">
          <div className="flex flex-1 items-center">
            <div className="h-2 w-1/2 border-y border-l border-[#1e3a5f] bg-[#1e3a5f]" style={{ width: chosen.px / 2 }} />
            <div className="h-2 w-1/2 border-y border-r border-[#1e3a5f] bg-white" style={{ width: chosen.px / 2 }} />
          </div>
        </div>
        <div className="text-[10px] font-bold text-[#1e3a5f]">
          {chosen.m}m
        </div>
      </div>
    </div>
  );
}
