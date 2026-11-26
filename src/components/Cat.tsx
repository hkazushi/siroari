"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { catHeadInner, catSittingEyesInner } from "@/lib/catArt";
import { cn } from "@/lib/utils";

function safeId(raw: string) {
  return `c${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** 顔だけ（ロゴ用）。動かさない場合は生成済みの /cat-head.svg を画像で表示（DOM を軽くする） */
export function CatHead({ size = 32, className, live = false }: { size?: number; className?: string; live?: boolean }) {
  const id = safeId(useId());
  const html = useMemo(() => (live ? catHeadInner(id) : ""), [id, live]);
  if (!live) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/cat-head.svg" width={size} height={size} alt="" aria-hidden="true" className={className} />;
  }
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={cn("cat-live", className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * 座った全身。しっぽ・体・頭は生成済みの画像（public/cat-layer-*.svg）を重ね、
 * 目だけ小さなインライン SVG にする（毛の本数が多く、インラインで動かすと重いため）。
 * live でまばたき・しっぽ・首かしげが動く。follow で目がポインタを追う。
 */
export function CatSitting({
  width = 120,
  className,
  live = true,
  follow = false,
  onClick,
}: {
  width?: number;
  className?: string;
  live?: boolean;
  follow?: boolean;
  onClick?: () => void;
}) {
  const id = safeId(useId());
  const eyes = useMemo(() => catSittingEyesInner(id), [id]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!follow) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        // 目の位置（viewBox 上で y≒105 / 300）
        const ex = r.left + r.width / 2;
        const ey = r.top + r.height * 0.35;
        const dx = e.clientX - ex;
        const dy = e.clientY - ey;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 300);
        el.style.setProperty("--px", `${((dx / d) * 4 * k).toFixed(2)}px`);
        el.style.setProperty("--py", `${((dy / d) * 3 * k).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [follow]);

  const layer = "absolute inset-0 h-full w-full";
  return (
    <div
      ref={ref}
      className={cn("cat-sit relative", live && "cat-live", onClick && "cursor-pointer", className)}
      style={{ width, height: (width * 300) / 240 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? "サビ猫" : undefined}
      aria-hidden={onClick ? undefined : "true"}
    >
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/cat-layer-tail.svg" alt="" draggable={false} className={cn(layer, "cat-tail-h")} />
      <img src="/cat-layer-body.svg" alt="" draggable={false} className={layer} />
      <div className={cn(layer, "cat-head-h")}>
        <img src="/cat-layer-head.svg" alt="" draggable={false} className={layer} />
        <svg viewBox="0 0 240 300" className={layer} dangerouslySetInnerHTML={{ __html: eyes }} />
      </div>
      {/* eslint-enable @next/next/no-img-element */}
    </div>
  );
}

// ---------------------------------------------------------------------
// 背景の猫（画面の右下に座っている）
// ---------------------------------------------------------------------

const STORAGE_KEY = "kaikei.cat";
const EVENT = "kaikei-cat-change";

export function useCatEnabled(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const read = () => {
      try {
        setOn(localStorage.getItem(STORAGE_KEY) !== "off");
      } catch {
        /* private mode */
      }
    };
    queueMicrotask(read);
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  const set = useCallback((v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, v ? "on" : "off");
    } catch {
      /* ignore */
    }
    setOn(v);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [on, set];
}

const TIPS = [
  "領収書はもらったらすぐ撮影するにゃ",
  "10万円以上の道具は「固定資産」に登録にゃ",
  "自宅兼事務所の家賃や電気代は、事業で使った割合だけ経費にゃ",
  "確定申告は 3月15日まで。早めに準備するにゃ",
  "請求書は「発行」すると売上に自動で入るにゃ",
  "入金されたら「入金済」にするのを忘れずににゃ",
  "e-Tax で出すと青色申告特別控除が 65万円になるにゃ",
  "帳簿は 7年間保存。年に一度はバックアップにゃ",
  "ATM で引き出したら「振替」で普通預金→現金にゃ",
  "わからないことは「AI相談」で聞いてにゃ",
];

export function BackgroundCat() {
  const [on] = useCatEnabled();
  const [tip, setTip] = useState<string | null>(null);
  const [hop, setHop] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!on) return null;

  function poke() {
    setHop((h) => h + 1);
    setTip(TIPS[idx.current % TIPS.length]);
    idx.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(null), 5000);
  }

  return (
    <div className="pointer-events-none fixed right-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-0 select-none md:right-6 md:bottom-3 print:hidden">
      {tip && (
        <div className="cat-bubble pointer-events-auto absolute right-2 bottom-full mb-1 w-56 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md">
          {tip}
          <span className="absolute -bottom-1.5 right-10 h-3 w-3 rotate-45 border-r border-b border-amber-200 bg-white" />
        </div>
      )}
      <div key={hop} className={cn("pointer-events-auto", hop > 0 && "cat-hop")}>
        <CatSitting width={96} follow onClick={poke} className="drop-shadow-sm md:!h-[150px] md:!w-[120px]" />
      </div>
    </div>
  );
}
