"use client";

import { useEffect, useState } from "react";

// If /logo.png exists, use it. Otherwise show an SVG fallback badge.
// We probe with Image() load before swapping to avoid a broken-image flash.
export function Logo({
  size = 96,
  withText = false,
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
      style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
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

// SVG fallback badge — circular emblem with bug silhouette + company name.
// Designed to capture the brand feel (navy + crimson + cartoon bug) while
// the actual /logo.png is not yet placed.
export function LogoBadge({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-label="東山メンテナンス"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="96" fill="#fff" stroke="#1e3a5f" strokeWidth="3" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#991b1b" strokeWidth="0.6" />

      {/* Top arc text */}
      <defs>
        <path id="topArc" d="M 35,100 A 65,65 0 0,1 165,100" fill="none" />
        <path id="botArc" d="M 35,100 A 65,65 0 0,0 165,100" fill="none" />
      </defs>
      <text fontSize="12" letterSpacing="2.4" fontWeight="700" fill="#1e3a5f">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">
          PEST CONTROL
        </textPath>
      </text>

      {/* Red side accents */}
      <g stroke="#991b1b" strokeWidth="1.2" strokeLinecap="round">
        <line x1="22" y1="78" x2="38" y2="80" />
        <line x1="22" y1="84" x2="38" y2="86" />
        <line x1="22" y1="90" x2="38" y2="92" />
        <line x1="162" y1="80" x2="178" y2="78" />
        <line x1="162" y1="86" x2="178" y2="84" />
        <line x1="162" y1="92" x2="178" y2="90" />
      </g>

      {/* Side icons: shield (L) + house (R) */}
      <g transform="translate(38 118)">
        <path
          d="M 0 0 L 6 -2 L 12 0 L 12 6 Q 12 10 6 13 Q 0 10 0 6 Z"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1.2"
        />
        <path d="M 3.5 6 L 6 8.5 L 9.5 4" fill="none" stroke="#1e3a5f" strokeWidth="1.2" />
      </g>
      <g transform="translate(148 118)">
        <path
          d="M 0 5 L 6 0 L 12 5 L 12 14 L 0 14 Z"
          fill="none"
          stroke="#1e3a5f"
          strokeWidth="1.2"
        />
        <rect x="4" y="9" width="4" height="5" fill="#1e3a5f" />
      </g>

      {/* Bug character */}
      <g transform="translate(100 95)">
        {/* Antennae */}
        <path d="M -7 -38 Q -22 -50 -32 -62" fill="none" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 7 -38 Q 22 -50 32 -62" fill="none" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        {/* Legs (left) */}
        <line x1="-25" y1="-6" x2="-42" y2="-16" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="-26" y1="6" x2="-46" y2="6" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="-24" y1="18" x2="-42" y2="30" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        {/* Legs (right) */}
        <line x1="25" y1="-6" x2="42" y2="-16" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="26" y1="6" x2="46" y2="6" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="24" y1="18" x2="42" y2="30" stroke="#1e293b" strokeWidth="1.6" strokeLinecap="round" />
        {/* Body */}
        <ellipse cx="0" cy="3" rx="22" ry="28" fill="#9a7553" stroke="#3b2412" strokeWidth="1.6" />
        {/* Body segment lines */}
        <path d="M -18 -8 Q 0 -4 18 -8" fill="none" stroke="#3b2412" strokeWidth="1" />
        <path d="M -20 4 Q 0 9 20 4" fill="none" stroke="#3b2412" strokeWidth="1" />
        <path d="M -19 16 Q 0 20 19 16" fill="none" stroke="#3b2412" strokeWidth="1" />
        {/* Head */}
        <ellipse cx="0" cy="-26" rx="20" ry="15" fill="#7c4a2b" stroke="#3b2412" strokeWidth="1.6" />
        {/* Eyes (whites) */}
        <circle cx="-7" cy="-30" r="5.5" fill="#fef9c3" stroke="#3b2412" strokeWidth="1" />
        <circle cx="7" cy="-30" r="5.5" fill="#fef9c3" stroke="#3b2412" strokeWidth="1" />
        {/* Pupils */}
        <circle cx="-6" cy="-29" r="2" fill="#1e293b" />
        <circle cx="8" cy="-29" r="2" fill="#1e293b" />
        {/* Smile */}
        <path d="M -8 -20 Q 0 -14 8 -20" fill="#dc2626" stroke="#3b2412" strokeWidth="1.2" />
        {/* Thumb up (white fist) */}
        <circle cx="-32" cy="-12" r="7" fill="#fff" stroke="#1e293b" strokeWidth="1.4" />
        <rect x="-34" y="-22" width="4" height="8" rx="2" fill="#fff" stroke="#1e293b" strokeWidth="1.2" />
      </g>

      {/* Bottom name banner */}
      <g>
        <path
          d="M 18 158 L 182 158 L 188 168 L 182 178 L 18 178 L 12 168 Z"
          fill="#fff"
          stroke="#1e3a5f"
          strokeWidth="2"
        />
        <path
          d="M 18 158 L 182 158"
          stroke="#991b1b"
          strokeWidth="0.6"
        />
        <text
          x="100"
          y="173"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fill="#1e3a5f"
          fontFamily="system-ui, 'Hiragino Sans', sans-serif"
        >
          東山メンテナンス
        </text>
      </g>
    </svg>
  );
}
