// 取引 → 仕訳 → 残高試算表 → 損益計算書 / 貸借対照表
// 仕訳は DB に保存せず、取引と固定資産から毎回導出する（二重管理を避けるため）。

import { ACCOUNTS, account, walletAccount, type AccountType } from "./accounts";
import { depreciationSchedule } from "./depreciation";
import { yearOf } from "./format";
import type { BusinessProfile, FixedAsset, Transaction } from "./types";

export interface JournalLine {
  code: string;
  dr: number;
  cr: number;
}

export interface JournalEntry {
  date: string;
  lines: JournalLine[];
  memo: string;
  partner: string;
  source: { type: "tx" | "settle" | "asset" | "dep" | "disposal"; id: string };
}

const OWNER_DRAW = "1900"; // 事業主貸
const OWNER_LOAN = "2900"; // 事業主借
const CAPITAL = "3100"; // 元入金
const AR = "1200"; // 売掛金
const AP = "2110"; // 未払金
const DEP = "6200"; // 減価償却費
const DISPOSAL = "6370"; // 固定資産除却損

function isSettledLater(t: Transaction): boolean {
  return t.status === "unpaid" || (t.paid_date != null && t.paid_date > t.date);
}

/** 1 取引から仕訳（1〜2 件）を作る */
export function journalForTransaction(t: Transaction): JournalEntry[] {
  const memo = t.memo || account(t.account_code).name;
  const partner = t.partner_name;
  const out: JournalEntry[] = [];

  if (t.kind === "transfer") {
    out.push({
      date: t.date,
      memo,
      partner,
      lines: [
        { code: t.account_code, dr: t.amount, cr: 0 },
        { code: t.from_code ?? "1110", dr: 0, cr: t.amount },
      ],
      source: { type: "tx", id: t.id },
    });
    return out;
  }

  const walletCode = walletAccount(t.wallet, t.kind);
  const later = isSettledLater(t);

  if (t.kind === "income") {
    const debit = later ? AR : walletCode;
    out.push({
      date: t.date,
      memo,
      partner,
      lines: [
        { code: debit, dr: t.amount, cr: 0 },
        { code: t.account_code, dr: 0, cr: t.amount },
      ],
      source: { type: "tx", id: t.id },
    });
    if (later && t.status === "paid" && t.paid_date && walletCode !== AR) {
      out.push({
        date: t.paid_date,
        memo: `${memo}（入金）`,
        partner,
        lines: [
          { code: walletCode, dr: t.amount, cr: 0 },
          { code: AR, dr: 0, cr: t.amount },
        ],
        source: { type: "settle", id: t.id },
      });
    }
    return out;
  }

  // expense
  const business = Math.floor((t.amount * t.business_ratio) / 100);
  const personal = t.amount - business;
  const credit = later ? AP : walletCode;
  const lines: JournalLine[] = [{ code: t.account_code, dr: business, cr: 0 }];
  if (personal > 0) lines.push({ code: OWNER_DRAW, dr: personal, cr: 0 });
  lines.push({ code: credit, dr: 0, cr: t.amount });
  out.push({ date: t.date, memo, partner, lines, source: { type: "tx", id: t.id } });
  if (later && t.status === "paid" && t.paid_date && walletCode !== AP) {
    out.push({
      date: t.paid_date,
      memo: `${memo}（支払）`,
      partner,
      lines: [
        { code: AP, dr: t.amount, cr: 0 },
        { code: walletCode, dr: 0, cr: t.amount },
      ],
      source: { type: "settle", id: t.id },
    });
  }
  return out;
}

/** 固定資産の取得・償却・除却の仕訳（year 年分） */
export function journalForAsset(a: FixedAsset, year: number): JournalEntry[] {
  const out: JournalEntry[] = [];
  if (yearOf(a.acquired_date) === year) {
    out.push({
      date: a.acquired_date,
      memo: `${a.name} 取得`,
      partner: "",
      lines: [
        { code: a.account_code, dr: a.cost, cr: 0 },
        { code: walletAccount(a.paid_from, "expense"), dr: 0, cr: a.cost },
      ],
      source: { type: "asset", id: a.id },
    });
  }
  const row = depreciationSchedule(a, year);
  if (row.depreciation > 0) {
    const personal = row.depreciation - row.businessPortion;
    const lines: JournalLine[] = [{ code: DEP, dr: row.businessPortion, cr: 0 }];
    if (personal > 0) lines.push({ code: OWNER_DRAW, dr: personal, cr: 0 });
    lines.push({ code: a.account_code, dr: 0, cr: row.depreciation });
    out.push({
      date: `${year}-12-31`,
      memo: `${a.name} 減価償却`,
      partner: "",
      lines,
      source: { type: "dep", id: a.id },
    });
  }
  if (row.disposed > 0) {
    const personal = row.disposed - row.disposalLoss;
    const lines: JournalLine[] = [{ code: DISPOSAL, dr: row.disposalLoss, cr: 0 }];
    if (personal > 0) lines.push({ code: OWNER_DRAW, dr: personal, cr: 0 });
    lines.push({ code: a.account_code, dr: 0, cr: row.disposed });
    out.push({
      date: a.disposed_date ?? `${year}-12-31`,
      memo: `${a.name} 除却`,
      partner: "",
      lines,
      source: { type: "disposal", id: a.id },
    });
  }
  return out;
}

/** year 年の全仕訳（日付順） */
export function journalForYear(txs: Transaction[], assets: FixedAsset[], year: number): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (const t of txs) {
    for (const e of journalForTransaction(t)) {
      if (yearOf(e.date) === year) entries.push(e);
    }
  }
  for (const a of assets) entries.push(...journalForAsset(a, year));
  entries.forEach((e) => (e.lines = e.lines.filter((l) => l.dr !== 0 || l.cr !== 0)));
  return entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ---------------------------------------------------------------------
// 残高
// ---------------------------------------------------------------------

export type Balances = Record<string, number>;

function normalSign(type: AccountType): 1 | -1 {
  return type === "asset" || type === "expense" ? 1 : -1;
}

/** 仕訳を残高（各科目の正常残高側をプラス）に加算 */
export function applyEntries(base: Balances, entries: JournalEntry[]): Balances {
  const b: Balances = { ...base };
  for (const e of entries) {
    for (const l of e.lines) {
      const s = normalSign(account(l.code).type);
      b[l.code] = (b[l.code] ?? 0) + s * (l.dr - l.cr);
    }
  }
  return b;
}

function sumType(b: Balances, type: AccountType, exclude: string[] = []): number {
  let s = 0;
  for (const [code, v] of Object.entries(b)) {
    if (exclude.includes(code)) continue;
    if (account(code).type === type) s += v;
  }
  return s;
}

/** ユーザーが入力した期首残高 → 元入金を自動計算して残高にする */
function openingFromInput(input: Record<string, number>): Balances {
  const b: Balances = {};
  for (const [code, v] of Object.entries(input)) {
    if (!v) continue;
    const t = account(code).type;
    if (t === "asset" || t === "liability") b[code] = v;
  }
  b[CAPITAL] = sumType(b, "asset") - sumType(b, "liability");
  return b;
}

/** 年末残高 → 翌年の期首残高（事業主貸・借と損益を元入金に振り替える） */
function carryForward(closing: Balances): Balances {
  const b: Balances = {};
  for (const [code, v] of Object.entries(closing)) {
    const t = account(code).type;
    if ((t === "asset" || t === "liability") && code !== OWNER_DRAW && code !== OWNER_LOAN && v !== 0) {
      b[code] = v;
    }
  }
  b[CAPITAL] = sumType(b, "asset") - sumType(b, "liability");
  return b;
}

export interface YearBooks {
  year: number;
  entries: JournalEntry[];
  opening: Balances;
  closing: Balances;
  /** 期首残高が手入力か（false なら前年から繰越 or 0） */
  openingIsManual: boolean;
}

/** year 年の帳簿一式。期首残高は手入力が無ければ前年から繰り越す。 */
export function booksForYear(
  txs: Transaction[],
  assets: FixedAsset[],
  profile: BusinessProfile,
  year: number,
): YearBooks {
  const manual = profile.opening_balances ?? {};
  const dataYears = [
    ...txs.map((t) => yearOf(t.date)),
    ...assets.map((a) => yearOf(a.acquired_date)),
    ...Object.keys(manual).map(Number),
  ].filter((y) => Number.isFinite(y) && y <= year);
  const start = dataYears.length ? Math.min(...dataYears) : year;

  let opening: Balances = manual[start] ? openingFromInput(manual[start]) : { [CAPITAL]: 0 };
  for (let y = start; y < year; y++) {
    const closing = applyEntries(opening, journalForYear(txs, assets, y));
    opening = manual[y + 1] ? openingFromInput(manual[y + 1]) : carryForward(closing);
  }
  const entries = journalForYear(txs, assets, year);
  return {
    year,
    entries,
    opening,
    closing: applyEntries(opening, entries),
    openingIsManual: Boolean(manual[year]),
  };
}

// ---------------------------------------------------------------------
// 決算書
// ---------------------------------------------------------------------

export interface ProfitLoss {
  revenue: { code: string; name: string; amount: number }[];
  revenueTotal: number;
  cogs: number;
  expenses: { code: string; name: string; amount: number; custom?: boolean }[];
  expenseTotal: number;
  /** 青色申告特別控除前の所得金額 */
  incomeBeforeDeduction: number;
  blueDeduction: number;
  income: number;
}

export function profitLoss(books: YearBooks, profile: BusinessProfile): ProfitLoss {
  // 損益は期中の仕訳だけで計算する（期首残高に損益科目は無い）
  const b = applyEntries({}, books.entries);
  const revenue = ACCOUNTS.filter((a) => a.type === "revenue").map((a) => ({
    code: a.code,
    name: a.name,
    amount: b[a.code] ?? 0,
  }));
  const revenueTotal = revenue.reduce((s, r) => s + r.amount, 0);
  const cogs = b["5100"] ?? 0;
  const expenses = ACCOUNTS.filter((a) => a.type === "expense" && a.code !== "5100").map((a) => ({
    code: a.code,
    name: a.name,
    amount: b[a.code] ?? 0,
    custom: a.custom,
  }));
  const expenseTotal = expenses.reduce((s, r) => s + r.amount, 0);
  const incomeBeforeDeduction = revenueTotal - cogs - expenseTotal;
  const blueDeduction = Math.max(0, Math.min(profile.blue_deduction, incomeBeforeDeduction));
  return {
    revenue,
    revenueTotal,
    cogs,
    expenses,
    expenseTotal,
    incomeBeforeDeduction,
    blueDeduction,
    income: incomeBeforeDeduction - blueDeduction,
  };
}

export interface BalanceSheetRow {
  code: string;
  name: string;
  opening: number;
  closing: number;
}

export interface BalanceSheet {
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  capital: { opening: number; closing: number };
  incomeBeforeDeduction: number;
  assetTotal: { opening: number; closing: number };
  liabilityTotal: { opening: number; closing: number };
  /** 貸借一致チェック（0 なら一致） */
  diff: number;
}

export function balanceSheet(books: YearBooks, pl: ProfitLoss): BalanceSheet {
  const rows = (type: AccountType) =>
    ACCOUNTS.filter((a) => a.type === type)
      .map((a) => ({
        code: a.code,
        name: a.name,
        opening: books.opening[a.code] ?? 0,
        closing: books.closing[a.code] ?? 0,
      }))
      .filter((r) => r.opening !== 0 || r.closing !== 0);
  const assets = rows("asset");
  const liabilities = rows("liability");
  const total = (rs: BalanceSheetRow[], k: "opening" | "closing") => rs.reduce((s, r) => s + r[k], 0);
  const capital = {
    opening: books.opening[CAPITAL] ?? 0,
    closing: books.closing[CAPITAL] ?? 0,
  };
  const assetTotal = { opening: total(assets, "opening"), closing: total(assets, "closing") };
  const liabilityTotal = {
    opening: total(liabilities, "opening") + capital.opening,
    closing: total(liabilities, "closing") + capital.closing + pl.incomeBeforeDeduction,
  };
  return {
    assets,
    liabilities,
    capital,
    incomeBeforeDeduction: pl.incomeBeforeDeduction,
    assetTotal,
    liabilityTotal,
    diff: assetTotal.closing - liabilityTotal.closing,
  };
}

/** 月別の売上・経費（事業分） */
export function monthly(books: YearBooks): { month: number; revenue: number; expense: number }[] {
  const rows = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, expense: 0 }));
  for (const e of books.entries) {
    const m = Number(e.date.slice(5, 7)) - 1;
    for (const l of e.lines) {
      const t = account(l.code).type;
      if (t === "revenue") rows[m].revenue += l.cr - l.dr;
      else if (t === "expense") rows[m].expense += l.dr - l.cr;
    }
  }
  return rows;
}

/** 総勘定元帳（1 科目） */
export function generalLedger(books: YearBooks, code: string) {
  const type = account(code).type;
  const s = normalSign(type);
  let bal = books.opening[code] ?? 0;
  const rows: {
    date: string;
    memo: string;
    partner: string;
    counter: string;
    dr: number;
    cr: number;
    balance: number;
  }[] = [];
  for (const e of books.entries) {
    const mine = e.lines.filter((l) => l.code === code);
    if (!mine.length) continue;
    const others = e.lines.filter((l) => l.code !== code).map((l) => account(l.code).name);
    for (const l of mine) {
      bal += s * (l.dr - l.cr);
      rows.push({
        date: e.date,
        memo: e.memo,
        partner: e.partner,
        counter: others.length > 1 ? "諸口" : (others[0] ?? ""),
        dr: l.dr,
        cr: l.cr,
        balance: bal,
      });
    }
  }
  return { opening: books.opening[code] ?? 0, rows, closing: bal };
}
