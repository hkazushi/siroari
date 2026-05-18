"use client";

import { useEffect, useState } from "react";

// If /logo.png exists, use it. Otherwise show an SVG fallback.
// We probe with a HEAD/Image() load before swapping to avoid a broken-image flash.
export function Logo({
  size = 96,
  withText = true,
  className,
}: {
  size?: number;
  withText?: boolean;
  className?: string;
}) {
  const [hasImage, setHasImage] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasImage(true);
    img.onerror = () => setHasImage(false);
    img.src = "/logo.png";
  }, []);
  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt="東山メンテナンス"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain" }}
        />
      ) : (
        <LogoBadge size={size} />
      )}
      {withText && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold text-[#1e3a5f]">
            東山メンテナンス
          </div>
          <div className="text-[10px] text-slate-500">
            害虫から、快適な暮らしを守る。
          </div>
        </div>
      )}
    </div>
  );
}

// SVG fallback — a stylized badge in the brand colors (navy + crimson).
export function LogoBadge({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label="東山メンテナンス"
    >
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#1e3a5f" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#991b1b" strokeWidth="1" />
      {/* shield top */}
      <path d="M 30 18 L 50 12 L 70 18 L 70 24 L 50 22 L 30 24 Z" fill="#991b1b" />
      {/* stylized 東 mark */}
      <text
        x="50"
        y="64"
        textAnchor="middle"
        fontSize="36"
        fontWeight="900"
        fill="#1e3a5f"
        fontFamily="system-ui, sans-serif"
      >
        東
      </text>
      {/* base */}
      <path d="M 22 80 L 78 80 L 78 86 L 22 86 Z" fill="#1e3a5f" />
    </svg>
  );
}
