"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./data";
import { currentYear, yearOf } from "./format";

const KEY = "kaikei.year";

interface YearCtx {
  year: number;
  setYear: (y: number) => void;
  years: number[];
}

const Ctx = createContext<YearCtx | null>(null);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const { transactions, assets, profile } = useData();
  const [year, setYearState] = useState(() => currentYear());

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(KEY));
      if (v > 2000 && v < 2100) queueMicrotask(() => setYearState(v));
    } catch {
      /* private mode */
    }
  }, []);

  const years = useMemo(() => {
    const now = currentYear();
    const all = [
      now,
      ...transactions.map((t) => yearOf(t.date)),
      ...assets.map((a) => yearOf(a.acquired_date)),
      ...Object.keys(profile.opening_balances ?? {}).map(Number),
    ].filter((y) => y > 2000 && y < 2100);
    const min = Math.min(...all);
    const max = Math.max(...all, now);
    return Array.from({ length: max - min + 1 }, (_, i) => max - i);
  }, [transactions, assets, profile]);

  const value = useMemo<YearCtx>(
    () => ({
      year,
      years: years.includes(year) ? years : [year, ...years].sort((a, b) => b - a),
      setYear: (y) => {
        setYearState(y);
        try {
          localStorage.setItem(KEY, String(y));
        } catch {
          /* ignore */
        }
      },
    }),
    [year, years],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useYear(): YearCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("YearProvider がありません");
  return v;
}
