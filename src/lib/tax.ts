// 消費税の概算（税込経理・割戻し計算）
// あくまで目安。申告書の作成は国税庁「確定申告書等作成コーナー」で行う前提。

import { account } from "./accounts";
import { yearOf } from "./format";
import type { BusinessProfile, FixedAsset, Transaction } from "./types";

export const TAX_METHOD_LABELS = {
  general: "一般課税（原則課税）",
  simplified: "簡易課税",
  twenty_percent: "2割特例",
} as const;

export const SIMPLIFIED_CATEGORIES: { id: number; label: string; rate: number }[] = [
  { id: 1, label: "第1種（卸売業）90%", rate: 0.9 },
  { id: 2, label: "第2種（小売業）80%", rate: 0.8 },
  { id: 3, label: "第3種（製造業・建設業）70%", rate: 0.7 },
  { id: 4, label: "第4種（飲食店業など）60%", rate: 0.6 },
  { id: 5, label: "第5種（サービス業）50%", rate: 0.5 },
  { id: 6, label: "第6種（不動産業）40%", rate: 0.4 },
];

export interface ConsumptionTaxSummary {
  sales10: number;
  sales8: number;
  salesExempt: number;
  purchases10: number;
  purchases8: number;
  purchasesExempt: number;
  /** 課税標準額（千円未満切捨） */
  base10: number;
  base8: number;
  /** 売上に係る消費税額（国税） */
  outputTax: number;
  /** 控除対象仕入税額（国税） */
  inputTax: number;
  /** 差引税額（国税・百円未満切捨） */
  national: number;
  /** 地方消費税（百円未満切捨） */
  local: number;
  total: number;
  method: BusinessProfile["tax_method"];
  /** 2割特例の適用期限内か */
  twentyPercentAvailable: boolean;
  /** 課税売上高（税抜）: 1,000 万円判定用 */
  taxableSalesExcl: number;
}

const floorTo = (n: number, unit: number) => Math.floor(n / unit) * unit;

export function consumptionTax(
  txs: Transaction[],
  assets: FixedAsset[],
  profile: BusinessProfile,
  year: number,
): ConsumptionTaxSummary {
  let sales10 = 0, sales8 = 0, salesExempt = 0, purchases10 = 0, purchases8 = 0, purchasesExempt = 0;
  for (const t of txs) {
    if (yearOf(t.date) !== year || t.kind === "transfer") continue;
    if (t.kind === "income") {
      if (t.tax_rate === 10) sales10 += t.amount;
      else if (t.tax_rate === 8) sales8 += t.amount;
      else salesExempt += t.amount;
    } else {
      const biz = Math.floor((t.amount * t.business_ratio) / 100);
      // 個人のお金で払ったものも事業分は仕入税額控除の対象
      if (t.tax_rate === 10) purchases10 += biz;
      else if (t.tax_rate === 8) purchases8 += biz;
      else purchasesExempt += biz;
    }
  }
  // 固定資産の取得は取得年に一括で仕入税額控除（10%）
  for (const a of assets) {
    if (yearOf(a.acquired_date) === year && account(a.account_code).type === "asset") {
      purchases10 += Math.floor((a.cost * a.business_ratio) / 100);
    }
  }

  const base10 = floorTo((sales10 * 100) / 110, 1000);
  const base8 = floorTo((sales8 * 100) / 108, 1000);
  const outputTax = Math.floor(base10 * 0.078) + Math.floor(base8 * 0.0624);
  let inputTax = 0;
  const method = profile.tax_method;
  if (method === "general") {
    inputTax = Math.floor((purchases10 * 7.8) / 110) + Math.floor((purchases8 * 6.24) / 108);
  } else if (method === "simplified") {
    const rate = SIMPLIFIED_CATEGORIES.find((c) => c.id === profile.simplified_category)?.rate ?? 0.5;
    inputTax = Math.floor(outputTax * rate);
  } else {
    inputTax = Math.floor(outputTax * 0.8);
  }
  const national = Math.max(0, floorTo(outputTax - inputTax, 100));
  const local = floorTo((national * 22) / 78, 100);
  return {
    sales10,
    sales8,
    salesExempt,
    purchases10,
    purchases8,
    purchasesExempt,
    base10,
    base8,
    outputTax,
    inputTax,
    national,
    local,
    total: national + local,
    method,
    // 2割特例は 2023年10月1日〜2026年12月31日の属する課税期間（個人は 2026 年分まで）
    twentyPercentAvailable: year >= 2023 && year <= 2026,
    taxableSalesExcl: Math.floor((sales10 * 100) / 110 + (sales8 * 100) / 108),
  };
}
