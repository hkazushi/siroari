// 金額・日付のフォーマット
// 日付は必ずローカル日付の 'YYYY-MM-DD' 文字列で扱う。
// Date#toISOString() は UTC になるため、日本時間の 0〜9 時に前日の日付になる（使用禁止）。

const yenFmt = new Intl.NumberFormat("ja-JP");

export function yen(n: number): string {
  return `¥${yenFmt.format(Math.round(n))}`;
}

export function num(n: number): string {
  return yenFmt.format(Math.round(n));
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toDateStr(new Date());
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

export function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

export function jpDate(date: string | null | undefined): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

/** 令和表記（2019-05-01 以降のみ対応） */
export function reiwa(year: number): string {
  const r = year - 2018;
  return r === 1 ? "令和元年" : `令和${r}年`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return toDateStr(new Date(y, m - 1, d + days));
}

export function endOfNextMonth(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return toDateStr(new Date(y, m + 1, 0));
}

/** "12,345" や "１２３４５円" を数値に */
export function parseAmount(s: string): number {
  const half = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const n = Number(half.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}
