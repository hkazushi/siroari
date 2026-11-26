"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { catHeadInner, catSittingEyesInner, catWalkLegsInner } from "@/lib/catArt";
import { SEASON_GREETING, SEASON_PROP_SVG, SEASON_TOY_SVG } from "@/lib/season";
import { cn } from "@/lib/utils";
import { useSeason } from "./Season";

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

/** イメージキャラの名前 */
export const CAT_NAME = "あかちゃん";

const TIPS = [
  "領収書の画像や PDF を入れると、経費が自動で入るよ",
  "領収書はもらったらすぐ撮影しておこう",
  "10万円以上の道具は「固定資産」に登録してね",
  "自宅兼事務所の家賃や電気代は、事業で使った割合だけ経費になるよ",
  "確定申告は 3月15日まで。早めに準備しよう",
  "請求書は「発行」すると売上に自動で入るよ",
  "入金されたら「入金済」にするのを忘れずに",
  "e-Tax で出すと青色申告特別控除が 65万円になるよ",
  "帳簿は 7年間保存。年に一度はバックアップしよう",
  "ATM で引き出したら「振替」で普通預金→現金だよ",
];

/** 歩く姿（右向き）。dir=-1 で左向き（顔は反転しない＝柄が崩れない） */
export function CatWalking({ width = 150, dir = 1 }: { width?: number; dir?: 1 | -1 }) {
  const far = useMemo(() => catWalkLegsInner("far"), []);
  const near = useMemo(() => catWalkLegsInner("near"), []);
  const layer = "absolute inset-0 h-full w-full";
  const height = (width * 200) / 300;
  return (
    <div className="cat-walk relative" style={{ width, height }}>
      <div className="cat-walk-bob absolute inset-0">
        <div className={layer} style={{ transform: dir === -1 ? "scaleX(-1)" : undefined }}>
          {/* eslint-disable @next/next/no-img-element */}
          <img src="/cat-walk-tail.svg" alt="" draggable={false} className={cn(layer, "cat-walk-tail")} />
          <svg viewBox="0 0 300 200" className={layer} dangerouslySetInnerHTML={{ __html: far }} />
          <svg viewBox="0 0 300 200" className={layer} dangerouslySetInnerHTML={{ __html: near }} />
          <img src="/cat-walk-body.svg" alt="" draggable={false} className={layer} />
        </div>
        {/* 顔は正面のまま、進む向きの側に置く */}
        <img
          src="/cat-head.svg"
          alt=""
          draggable={false}
          className="absolute"
          style={{
            width: `${(118 / 300) * 100}%`,
            height: `${(118 / 200) * 100}%`,
            top: `${(-2 / 200) * 100}%`,
            left: dir === 1 ? `${(178 / 300) * 100}%` : `${(4 / 300) * 100}%`,
          }}
        />
        {/* eslint-enable @next/next/no-img-element */}
      </div>
    </div>
  );
}

type Pose = { mode: "sit" | "walk"; x: number; dir: 1 | -1; dur: number };

/**
 * 画面下のあかちゃん。内容の手前（z-20。ヘッダー z-30・ダイアログ z-50 より下）に出す。
 * 右下に座っていて、ときどき画面の下を歩いて別の場所に座り直す。
 * タップするとひとこと。「動きを減らす」設定の端末では歩かない。
 */
export function BackgroundCat() {
  const [tip, setTip] = useState<string | null>(null);
  const [hop, setHop] = useState(0);
  const [vw, setVw] = useState(0);
  const [pose, setPose] = useState<Pose | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idx = useRef(0);
  const season = useSeason();
  const [toy, setToy] = useState<{ id: number; caught: boolean } | null>(null);

  const mobile = vw > 0 && vw < 768;
  const sitW = mobile ? 84 : 112;
  const walkW = mobile ? 120 : 160;

  // 画面幅
  useEffect(() => {
    const read = () => setVw(window.innerWidth);
    queueMicrotask(read);
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  // 最初は右下に座る
  useEffect(() => {
    if (!vw) return;
    queueMicrotask(() =>
      setPose((p) => {
        const maxX = Math.max(8, vw - sitW - 16);
        if (!p) return { mode: "sit", x: maxX, dir: -1, dur: 0 };
        return p.x > maxX ? { ...p, x: maxX } : p;
      }),
    );
  }, [vw, sitW]);

  // 座る → しばらくして歩く → 着いたら座る
  useEffect(() => {
    if (!pose || !vw) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    if (pose.mode === "sit") {
      const t = setTimeout(
        () => {
          const minX = 8;
          const maxX = Math.max(minX, vw - walkW - 16);
          if (maxX - minX < 120) return; // 狭い画面では歩かない
          let target = minX + Math.random() * (maxX - minX);
          if (Math.abs(target - pose.x) < 120) target = pose.x > (minX + maxX) / 2 ? minX + Math.random() * 60 : maxX - Math.random() * 60;
          const dist = Math.abs(target - pose.x);
          setPose({ mode: "walk", x: target, dir: target > pose.x ? 1 : -1, dur: dist / 55 });
        },
        12000 + Math.random() * 20000,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPose((p) => (p ? { ...p, mode: "sit", dur: 0 } : p)), pose.dur * 1000 + 50);
    return () => clearTimeout(t);
  }, [pose, vw, walkW]);

  useEffect(
    () => () => {
      if (tipTimer.current) clearTimeout(tipTimer.current);
    },
    [],
  );

  // 季節の遊び: 座っていると、ときどき季節のもの（花びら・雪・葉っぱ…）が落ちてきて、ジャンプして捕まえる
  const sitting = pose?.mode === "sit";
  useEffect(() => {
    if (!season || !sitting) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const loop = () => {
      timers.push(
        setTimeout(
          () => {
            const id = Date.now();
            setToy({ id, caught: false });
            // 落ちてきたところでジャンプ
            timers.push(
              setTimeout(() => {
                setHop((h) => h + 1);
                setToy((t) => (t && t.id === id ? { ...t, caught: true } : t));
              }, 2300),
            );
            timers.push(setTimeout(() => setToy((t) => (t && t.id === id ? null : t)), 2800));
            loop();
          },
          7000 + Math.random() * 9000,
        ),
      );
    };
    loop();
    return () => {
      timers.forEach(clearTimeout);
      setToy(null);
    };
  }, [season, sitting]);

  if (!pose) return null;

  function poke() {
    setHop((h) => h + 1);
    // 季節があるときは 3 回に 1 回（最初の 1 回目も）季節のあいさつ
    if (season && idx.current % 3 === 0) {
      const g = SEASON_GREETING[season];
      setTip(g[Math.floor(idx.current / 3) % g.length]);
    } else {
      setTip(TIPS[idx.current % TIPS.length]);
    }
    idx.current += 1;
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setTip(null), 5000);
  }

  const w = pose.mode === "walk" ? walkW : sitW;
  return (
    <div
      className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 z-20 select-none md:bottom-2 print:hidden"
      style={{
        transform: `translateX(${pose.x}px)`,
        transition: pose.mode === "walk" ? `transform ${pose.dur}s linear` : "none",
        width: w,
      }}
    >
      {tip && (
        <div
          className={cn(
            "cat-bubble pointer-events-auto absolute bottom-full mb-1 w-56 rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md",
            pose.x > vw / 2 ? "right-0" : "left-0",
          )}
        >
          <div className="mb-0.5 text-[11px] font-bold text-[#991b1b]">{CAT_NAME}</div>
          {tip}
        </div>
      )}
      <div
        key={hop}
        // 歩いている間はクリックを素通りさせる（下のボタンを邪魔しない）。座っているときはタップでひとこと
        className={cn(pose.mode === "sit" ? "pointer-events-auto cursor-pointer" : "pointer-events-none", hop > 0 && "cat-hop")}
        onClick={poke}
        role="button"
        aria-label={`${CAT_NAME}（サビ猫）`}
      >
        {pose.mode === "walk" ? (
          <CatWalking width={walkW} dir={pose.dir} />
        ) : (
          <CatSitting width={sitW} follow className="drop-shadow-sm" />
        )}
      </div>
      {season && pose.mode === "sit" && (
        <>
          {/* 横に置く季節の小物（画面の内側に置く） */}
          <svg
            viewBox="0 0 60 60"
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0"
            style={{
              width: sitW * 0.42,
              height: sitW * 0.42,
              ...(pose.x > vw / 2 ? { right: "100%", marginRight: -4 } : { left: "100%", marginLeft: -4 }),
            }}
            dangerouslySetInnerHTML={{ __html: SEASON_PROP_SVG[season] }}
          />
          {toy && (
            <div
              key={toy.id}
              className={cn("pointer-events-none absolute left-1/2", toy.caught ? "cat-toy-pop" : "cat-toy-fall")}
              style={{ bottom: sitW * 1.08, width: 18, height: 18, marginLeft: -9 }}
            >
              <svg viewBox="-10 -10 20 20" className="h-full w-full" dangerouslySetInnerHTML={{ __html: SEASON_TOY_SVG[season] }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
