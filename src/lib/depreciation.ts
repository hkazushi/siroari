// 減価償却（個人事業主・平成19年4月1日以後取得の定額法）
// 個人は償却が強制（任意償却不可）。帳簿価額は備忘価額 1 円まで償却する。

import type { FixedAsset } from "./types";

/** 定額法の償却率（耐用年数省令 別表第八） */
export const STRAIGHT_RATES: Record<number, number> = {
  2: 0.5, 3: 0.334, 4: 0.25, 5: 0.2, 6: 0.167, 7: 0.143, 8: 0.125, 9: 0.112, 10: 0.1,
  11: 0.091, 12: 0.084, 13: 0.077, 14: 0.072, 15: 0.067, 16: 0.063, 17: 0.059, 18: 0.056,
  19: 0.053, 20: 0.05, 21: 0.048, 22: 0.046, 23: 0.044, 24: 0.042, 25: 0.04, 26: 0.039,
  27: 0.038, 28: 0.036, 29: 0.035, 30: 0.034, 31: 0.033, 32: 0.032, 33: 0.031, 34: 0.03,
  35: 0.029, 36: 0.028, 37: 0.028, 38: 0.027, 39: 0.026, 40: 0.025, 41: 0.025, 42: 0.024,
  43: 0.024, 44: 0.023, 45: 0.023, 46: 0.022, 47: 0.022, 48: 0.021, 49: 0.021, 50: 0.02,
};

/** よく使う耐用年数のプリセット */
export const LIFE_PRESETS: { label: string; life: number; account: string }[] = [
  { label: "軽自動車（4年）", life: 4, account: "1520" },
  { label: "普通自動車（6年）", life: 6, account: "1520" },
  { label: "中古車（簡便法・別途計算）", life: 2, account: "1520" },
  { label: "パソコン（4年）", life: 4, account: "1530" },
  { label: "サーバー・複合機（5年）", life: 5, account: "1530" },
  { label: "噴霧器・動力散布機（5年）", life: 5, account: "1530" },
  { label: "床下点検ロボ・カメラ（5年）", life: 5, account: "1530" },
  { label: "ソフトウエア（5年）", life: 5, account: "1530" },
  { label: "エアコン・応接セット（6年）", life: 6, account: "1530" },
];

export const METHOD_LABELS = {
  straight: "定額法",
  lump_sum_3y: "一括償却資産（3年均等）",
  small_amount: "少額減価償却資産の特例（全額）",
} as const;

export interface DepRow {
  asset: FixedAsset;
  /** 期首帳簿価額（本年取得なら 0） */
  opening: number;
  /** 本年取得価額（本年取得でなければ 0） */
  acquired: number;
  /** 本年の償却費（全体） */
  depreciation: number;
  /** うち必要経費算入額 */
  businessPortion: number;
  /** 除却した帳簿価額（全体） */
  disposed: number;
  /** 除却損（事業分） */
  disposalLoss: number;
  /** 期末帳簿価額 */
  closing: number;
  /** 本年償却月数 */
  months: number;
  rate: number;
}

function ym(date: string) {
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) };
}

export function straightRate(life: number): number {
  return STRAIGHT_RATES[life] ?? (life <= 1 ? 1 : Math.round((1 / life) * 1000) / 1000);
}

/** 年 year の償却額（全体・事業按分前）。book = 年初（取得年は取得価額）の帳簿価額 */
function depForYear(a: FixedAsset, year: number, book: number): { dep: number; months: number } {
  const acq = ym(a.acquired_date);
  if (year < acq.y || book <= 0) return { dep: 0, months: 0 };
  const disp = a.disposed_date ? ym(a.disposed_date) : null;

  if (a.method === "small_amount") {
    return year === acq.y ? { dep: book, months: 12 } : { dep: 0, months: 0 };
  }
  if (a.method === "lump_sum_3y") {
    // 一括償却資産は月割せず 3 年で均等。途中で除却しても償却を続ける。
    const idx = year - acq.y;
    if (idx > 2) return { dep: 0, months: 0 };
    const dep = idx === 2 ? book : Math.min(Math.floor(a.cost / 3), book);
    return { dep, months: 12 };
  }

  // 定額法（月割、1か月未満は1か月）
  if (disp && year > disp.y) return { dep: 0, months: 0 };
  const startM = year === acq.y ? acq.m : 1;
  const endM = disp && disp.y === year ? disp.m : 12;
  const months = Math.max(0, endM - startM + 1);
  const full = Math.floor((a.cost * straightRate(a.useful_life) * months) / 12);
  const dep = Math.min(full, book - 1); // 備忘価額 1 円を残す
  return { dep: Math.max(0, dep), months };
}

export function depreciationSchedule(a: FixedAsset, year: number): DepRow {
  const acq = ym(a.acquired_date);
  const disp = a.disposed_date ? ym(a.disposed_date) : null;
  const removable = a.method === "straight";
  let book = a.cost;
  for (let y = acq.y; y < year; y++) {
    book -= depForYear(a, y, book).dep;
    if (removable && disp && disp.y === y) book = 0;
  }
  if (year < acq.y) book = 0;
  const { dep, months } = depForYear(a, year, book);
  let closing = book - dep;
  let disposed = 0;
  if (removable && disp && disp.y === year && closing > 0) {
    disposed = closing;
    closing = 0;
  }
  return {
    asset: a,
    opening: year === acq.y ? 0 : book,
    acquired: year === acq.y ? a.cost : 0,
    depreciation: dep,
    businessPortion: Math.floor((dep * a.business_ratio) / 100),
    disposed,
    disposalLoss: Math.floor((disposed * a.business_ratio) / 100),
    closing,
    months,
    rate: a.method === "straight" ? straightRate(a.useful_life) : a.method === "lump_sum_3y" ? 0.334 : 1,
  };
}
