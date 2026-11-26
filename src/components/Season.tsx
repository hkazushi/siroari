"use client";

import { useEffect, useRef, useState } from "react";
import { currentSeason, mapleLeafPath, type Season } from "@/lib/season";

/** 現在の季節（?season= の試し表示にも対応）。サーバー描画では null */
export function useSeason(): Season | null {
  const [s, setS] = useState<Season | null>(null);
  useEffect(() => {
    queueMicrotask(() => setS(currentSeason()));
  }, []);
  return s;
}

type P = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  rot: number;
  spin: number;
  phase: number;
  sway: number;
  kind: number;
  color: string;
};

const PALETTE: Record<Season, string[]> = {
  newyear: ["#e0475b", "#f28aa0", "#f6d36b", "#e8b93c"],
  snow: ["#b7c8da", "#c4d3e3", "#aebfd3"],
  sakura: ["#f6b5c6", "#f9c9d6", "#f3a2b8"],
  halloween: ["#f08a24", "#8e5bd6", "#f5b04a", "#6b3fb0"],
  autumn: ["#d9452b", "#e8742a", "#e9a23b", "#c2362a"],
};

const SPEED: Record<Season, [number, number]> = {
  newyear: [25, 45],
  snow: [18, 38],
  sakura: [22, 40],
  halloween: [25, 45],
  autumn: [28, 50],
};

/**
 * 画面の背景に季節のもの（雪・桜・紅葉・ハロウィン・正月）を舞わせる。
 * 内容の奥（z-0）に描くので、カードの間や余白に見える。操作の邪魔はしない。
 */
export function SeasonalBackground() {
  const season = useSeason();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!season) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = PALETTE[season];
    const [vmin, vmax] = SPEED[season];
    const count = Math.min(season === "snow" ? 55 : 38, Math.round((w * h) / (season === "snow" ? 30000 : 45000)));
    const make = (top: boolean): P => {
      const big = season === "halloween" || season === "autumn" ? 1.3 : 1;
      return {
        x: Math.random() * w,
        y: top ? -20 - Math.random() * 40 : Math.random() * h,
        vy: vmin + Math.random() * (vmax - vmin),
        vx: (Math.random() - 0.5) * 12,
        size: (season === "snow" ? 2.6 + Math.random() * 3.2 : 5 + Math.random() * 4) * big,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
        sway: 10 + Math.random() * 25,
        kind: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    };
    const ps: P[] = Array.from({ length: count }, () => make(false));
    const maple = new Path2D(mapleLeafPath(1));

    // ハロウィンのコウモリ（ときどき横切る）
    let bat: { x: number; y: number; vx: number; t: number } | null = null;
    let nextBat = performance.now() + 6000;

    const drawPetal = (s: number) => {
      ctx.beginPath();
      // 付け根が細く、先が広くて小さな切れ込みのある花びら
      ctx.moveTo(0, s);
      ctx.bezierCurveTo(-s * 0.5, s * 0.6, -s * 0.62, -s * 0.3, -s * 0.38, -s * 0.85);
      ctx.quadraticCurveTo(-s * 0.15, -s * 1.02, 0, -s * 0.74);
      ctx.quadraticCurveTo(s * 0.15, -s * 1.02, s * 0.38, -s * 0.85);
      ctx.bezierCurveTo(s * 0.62, -s * 0.3, s * 0.5, s * 0.6, 0, s);
      ctx.fill();
    };
    const drawPlum = (s: number, color: string) => {
      ctx.fillStyle = color;
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 - 90) * (Math.PI / 180);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#f6d36b";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    };
    const drawPumpkin = (s: number) => {
      ctx.fillStyle = "#f08a24";
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c96a12";
      ctx.lineWidth = s * 0.12;
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.75);
      ctx.quadraticCurveTo(-s * 0.55, 0, -s * 0.3, s * 0.78);
      ctx.moveTo(s * 0.35, -s * 0.75);
      ctx.quadraticCurveTo(s * 0.55, 0, s * 0.3, s * 0.78);
      ctx.stroke();
      ctx.strokeStyle = "#4b7a32";
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.lineTo(s * 0.15, -s * 1.15);
      ctx.stroke();
    };
    const drawBat = (x: number, y: number, t: number) => {
      const flap = Math.sin(t * 18) * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(40,28,46,0.85)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.quadraticCurveTo(sgn * 10, -8 - flap * 10, sgn * 20, -2 - flap * 8);
        ctx.quadraticCurveTo(sgn * 15, 0, sgn * 13, 4);
        ctx.quadraticCurveTo(sgn * 9, 1, sgn * 6, 5);
        ctx.quadraticCurveTo(sgn * 4, 2, 0, 3);
        ctx.fill();
      }
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.phase += dt * 1.6;
        p.y += p.vy * dt;
        p.x += p.vx * dt + Math.sin(p.phase) * p.sway * dt;
        p.rot += p.spin * dt;
        if (p.y > h + 20 || p.x < -40 || p.x > w + 40) Object.assign(p, make(true));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (season === "snow") {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === "sakura") {
          ctx.scale(Math.cos(p.phase * 1.3), 1); // ひらひら
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.85;
          drawPetal(p.size);
        } else if (season === "autumn") {
          ctx.scale(Math.cos(p.phase * 1.1) * 0.8 + 0.2, 1);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.85;
          ctx.scale(p.size, p.size);
          ctx.fill(maple);
        } else if (season === "newyear") {
          ctx.globalAlpha = 0.9;
          if (p.kind < 0.55) drawPlum(p.size * 0.8, p.color === "#f6d36b" || p.color === "#e8b93c" ? "#e0475b" : p.color);
          else {
            ctx.scale(Math.cos(p.phase * 2), 1);
            ctx.fillStyle = p.color === "#e0475b" || p.color === "#f28aa0" ? "#e8b93c" : p.color;
            ctx.fillRect(-p.size * 0.4, -p.size * 0.25, p.size * 0.8, p.size * 0.5);
          }
        } else if (season === "halloween") {
          ctx.globalAlpha = 0.9;
          if (p.kind < 0.35) drawPumpkin(p.size * 0.8);
          else {
            ctx.scale(Math.cos(p.phase * 2), 1);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size * 0.35, -p.size * 0.22, p.size * 0.7, p.size * 0.44);
          }
        }
        ctx.restore();
      }
      if (season === "halloween") {
        if (!bat && now > nextBat) {
          const fromLeft = Math.random() < 0.5;
          bat = { x: fromLeft ? -30 : w + 30, y: 80 + Math.random() * h * 0.4, vx: (fromLeft ? 1 : -1) * (90 + Math.random() * 60), t: 0 };
        }
        if (bat) {
          bat.t += dt;
          bat.x += bat.vx * dt;
          bat.y += Math.sin(bat.t * 3) * 20 * dt;
          drawBat(bat.x, bat.y, bat.t);
          if (bat.x < -60 || bat.x > w + 60) {
            bat = null;
            nextBat = now + 8000 + Math.random() * 12000;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener("visibilitychange", onVis);
    start();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [season]);

  if (!season) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 print:hidden" aria-hidden="true" />;
}
