"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, Spinner, YearSelect } from "@/components/ui";
import { account } from "@/lib/accounts";
import { useData } from "@/lib/data";
import { METHOD_LABELS, depreciationSchedule } from "@/lib/depreciation";
import { jpDate, num, reiwa, yearOf } from "@/lib/format";
import { useBooks } from "@/lib/useBooks";
import { useYear } from "@/lib/year";

const th = "border border-slate-500 bg-slate-100 px-1.5 py-1 font-normal";
const td = "border border-slate-500 px-1.5 py-1";
const tdn = `${td} text-right tabular-nums`;

export default function BlueReturnPage() {
  const { loading, profile, assets, transactions } = useData();
  const { year, setYear, years } = useYear();
  const { pl, bs, books } = useBooks(year);

  // 月別売上・仕入（決算書 2 ページ目）
  const monthly = useMemo(() => {
    const rows = Array.from({ length: 12 }, () => ({ sales: 0, purchase: 0 }));
    let misc = 0;
    for (const e of books.entries) {
      const m = Number(e.date.slice(5, 7)) - 1;
      for (const l of e.lines) {
        if (l.code === "4100") rows[m].sales += l.cr - l.dr;
        else if (l.code === "4200") misc += l.cr - l.dr;
        else if (l.code === "5100") rows[m].purchase += l.dr - l.cr;
      }
    }
    return { rows, misc };
  }, [books.entries]);

  const depRows = assets
    .map((a) => depreciationSchedule(a, year))
    .filter((r) => r.depreciation > 0 || r.acquired > 0 || r.disposed > 0);

  // 地代家賃の内訳
  const rents = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== "expense" || t.account_code !== "6250" || yearOf(t.date) !== year) continue;
      const k = t.partner_name || "（支払先未入力）";
      m.set(k, (m.get(k) ?? 0) + Math.floor((t.amount * t.business_ratio) / 100));
    }
    return [...m.entries()];
  }, [transactions, year]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // 決算書の経費欄（既定の欄 → 空欄 → 雑費の順）
  const fixed = pl.expenses.filter((e) => !e.custom && e.code !== "6390");
  const customs = pl.expenses.filter((e) => e.custom && e.amount !== 0);
  const misc = pl.expenses.find((e) => e.code === "6390");

  return (
    <div className="min-h-dvh bg-slate-100 py-4 print:bg-white print:py-0">
      <div className="mx-auto mb-3 flex max-w-[210mm] flex-wrap items-center gap-2 px-4 print:hidden">
        <Link href="/reports" className="mr-auto inline-flex items-center gap-1 text-sm text-slate-600">
          <ArrowLeft size={14} /> 決算・帳簿
        </Link>
        <YearSelect value={year} onChange={setYear} years={years} />
        <Button onClick={() => window.print()}>
          <Printer size={15} /> 印刷 / PDF
        </Button>
      </div>
      <p className="mx-auto mb-3 max-w-[210mm] px-4 text-xs text-slate-600 print:hidden">
        国税庁「確定申告書等作成コーナー」で青色申告決算書を作るときに、この数字を書き写してください（様式そのものではありません）。
        e-Tax で提出すると青色申告特別控除は 65 万円、紙で提出すると 55 万円になります。
      </p>

      <Sheet>
        <Title year={year} page="1" name="損益計算書" />
        <Header profile={profile} />
        <table className="mt-3 w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <th className={th} colSpan={2}>
                科目
              </th>
              <th className={th}>金額（円）</th>
            </tr>
            <tr>
              <td className={td} colSpan={2}>
                売上（収入）金額（雑収入を含む）
              </td>
              <td className={tdn}>{num(pl.revenueTotal)}</td>
            </tr>
            <tr>
              <td className={td} rowSpan={6}>
                売上原価
              </td>
              <td className={td}>期首商品（製品）棚卸高</td>
              <td className={tdn}>0</td>
            </tr>
            <tr>
              <td className={td}>仕入金額（製品製造原価）</td>
              <td className={tdn}>{num(pl.cogs)}</td>
            </tr>
            <tr>
              <td className={td}>小計</td>
              <td className={tdn}>{num(pl.cogs)}</td>
            </tr>
            <tr>
              <td className={td}>期末商品（製品）棚卸高</td>
              <td className={tdn}>0</td>
            </tr>
            <tr>
              <td className={td}>差引原価</td>
              <td className={tdn}>{num(pl.cogs)}</td>
            </tr>
            <tr>
              <td className={td}>差引金額</td>
              <td className={tdn}>{num(pl.revenueTotal - pl.cogs)}</td>
            </tr>
            {fixed.map((e, i) => (
              <tr key={e.code}>
                {i === 0 && (
                  <td className={td} rowSpan={fixed.length + customs.length + 2}>
                    経費
                  </td>
                )}
                <td className={td}>{e.name}</td>
                <td className={tdn}>{num(e.amount)}</td>
              </tr>
            ))}
            {customs.map((e) => (
              <tr key={e.code}>
                <td className={td}>
                  {e.name}
                  <span className="text-[9px] text-slate-500">（空欄に記入）</span>
                </td>
                <td className={tdn}>{num(e.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className={td}>雑費</td>
              <td className={tdn}>{num(misc?.amount ?? 0)}</td>
            </tr>
            <tr>
              <td className={`${td} font-bold`}>計</td>
              <td className={`${tdn} font-bold`}>{num(pl.expenseTotal)}</td>
            </tr>
            <tr>
              <td className={td} colSpan={2}>
                差引金額
              </td>
              <td className={tdn}>{num(pl.revenueTotal - pl.cogs - pl.expenseTotal)}</td>
            </tr>
            <tr>
              <td className={td} colSpan={2}>
                各種引当金・準備金等（繰戻額・繰入額）
              </td>
              <td className={tdn}>0</td>
            </tr>
            <tr>
              <td className={`${td} font-bold`} colSpan={2}>
                青色申告特別控除前の所得金額
              </td>
              <td className={`${tdn} font-bold`}>{num(pl.incomeBeforeDeduction)}</td>
            </tr>
            <tr>
              <td className={td} colSpan={2}>
                青色申告特別控除額
              </td>
              <td className={tdn}>{num(pl.blueDeduction)}</td>
            </tr>
            <tr>
              <td className={`${td} font-bold`} colSpan={2}>
                所得金額
              </td>
              <td className={`${tdn} font-bold`}>{num(pl.income)}</td>
            </tr>
          </tbody>
        </table>
      </Sheet>

      <Sheet>
        <Title year={year} page="2" name="月別売上（収入）金額及び仕入金額 ／ 青色申告特別控除額の計算" />
        <table className="mt-3 w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={th}>月</th>
              <th className={th}>売上（収入）金額</th>
              <th className={th}>仕入金額</th>
            </tr>
          </thead>
          <tbody>
            {monthly.rows.map((r, i) => (
              <tr key={i}>
                <td className={`${td} text-center`}>{i + 1}</td>
                <td className={tdn}>{num(r.sales)}</td>
                <td className={tdn}>{num(r.purchase)}</td>
              </tr>
            ))}
            <tr>
              <td className={td}>家事消費等</td>
              <td className={tdn}>0</td>
              <td className={td} />
            </tr>
            <tr>
              <td className={td}>雑収入</td>
              <td className={tdn}>{num(monthly.misc)}</td>
              <td className={td} />
            </tr>
            <tr>
              <td className={`${td} font-bold`}>計</td>
              <td className={`${tdn} font-bold`}>{num(pl.revenueTotal)}</td>
              <td className={`${tdn} font-bold`}>{num(pl.cogs)}</td>
            </tr>
          </tbody>
        </table>
        <table className="mt-6 w-full border-collapse text-[11px]">
          <tbody>
            <tr>
              <td className={td}>青色申告特別控除前の所得金額</td>
              <td className={tdn}>{num(pl.incomeBeforeDeduction)}</td>
            </tr>
            <tr>
              <td className={td}>
                青色申告特別控除額（設定: {num(profile.blue_deduction)} 円。所得金額が上限）
              </td>
              <td className={tdn}>{num(pl.blueDeduction)}</td>
            </tr>
          </tbody>
        </table>
      </Sheet>

      <Sheet>
        <Title year={year} page="3" name="減価償却費の計算 ／ 地代家賃の内訳" />
        <table className="mt-3 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              <th className={th}>資産の名称</th>
              <th className={th}>取得年月</th>
              <th className={th}>取得価額</th>
              <th className={th}>償却方法</th>
              <th className={th}>耐用年数</th>
              <th className={th}>償却率</th>
              <th className={th}>本年中の償却期間</th>
              <th className={th}>本年分の償却費</th>
              <th className={th}>事業専用割合</th>
              <th className={th}>必要経費算入額</th>
              <th className={th}>未償却残高（期末）</th>
            </tr>
          </thead>
          <tbody>
            {depRows.length === 0 ? (
              <tr>
                <td className={`${td} text-center text-slate-500`} colSpan={11}>
                  該当なし
                </td>
              </tr>
            ) : (
              depRows.map((r) => (
                <tr key={r.asset.id}>
                  <td className={td}>
                    {r.asset.name}
                    <div className="text-[9px] text-slate-500">{account(r.asset.account_code).name}</div>
                  </td>
                  <td className={td}>{jpDate(r.asset.acquired_date).replace(/\d+日$/, "")}</td>
                  <td className={tdn}>{num(r.asset.cost)}</td>
                  <td className={td}>{r.asset.method === "straight" ? "定額" : METHOD_LABELS[r.asset.method]}</td>
                  <td className={`${td} text-center`}>{r.asset.method === "straight" ? `${r.asset.useful_life}年` : "—"}</td>
                  <td className={`${td} text-center`}>{r.asset.method === "straight" ? r.rate.toFixed(3) : r.asset.method === "lump_sum_3y" ? "1/3" : "—"}</td>
                  <td className={`${td} text-center`}>{r.months}/12</td>
                  <td className={tdn}>{num(r.depreciation)}</td>
                  <td className={`${td} text-center`}>{r.asset.business_ratio}%</td>
                  <td className={tdn}>{num(r.businessPortion)}</td>
                  <td className={tdn}>{num(r.closing)}</td>
                </tr>
              ))
            )}
            <tr>
              <td className={`${td} font-bold`} colSpan={7}>
                計
              </td>
              <td className={`${tdn} font-bold`}>{num(depRows.reduce((s, r) => s + r.depreciation, 0))}</td>
              <td className={td} />
              <td className={`${tdn} font-bold`}>{num(depRows.reduce((s, r) => s + r.businessPortion, 0))}</td>
              <td className={`${tdn} font-bold`}>{num(depRows.reduce((s, r) => s + r.closing, 0))}</td>
            </tr>
          </tbody>
        </table>
        <h3 className="mt-6 text-[12px] font-bold">地代家賃の内訳</h3>
        <table className="mt-1 w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={th}>支払先</th>
              <th className={th}>本年中の必要経費算入額</th>
            </tr>
          </thead>
          <tbody>
            {rents.length === 0 ? (
              <tr>
                <td className={`${td} text-center text-slate-500`} colSpan={2}>
                  該当なし
                </td>
              </tr>
            ) : (
              rents.map(([k, v]) => (
                <tr key={k}>
                  <td className={td}>{k}</td>
                  <td className={tdn}>{num(v)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="mt-1 text-[9px] text-slate-500">※ 支払先の住所・賃借物件・年間賃借料は作成コーナーで入力してください。</p>
      </Sheet>

      <Sheet>
        <Title year={year} page="4" name="貸借対照表（資産負債調）" />
        <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
          <table className="w-full border-collapse self-start">
            <thead>
              <tr>
                <th className={th}>資産の部</th>
                <th className={th}>1月1日（期首）</th>
                <th className={th}>12月31日（期末）</th>
              </tr>
            </thead>
            <tbody>
              {bs.assets.map((r) => (
                <tr key={r.code}>
                  <td className={td}>{r.name}</td>
                  <td className={tdn}>{r.code === "1900" ? "" : num(r.opening)}</td>
                  <td className={tdn}>{num(r.closing)}</td>
                </tr>
              ))}
              <tr>
                <td className={`${td} font-bold`}>合計</td>
                <td className={`${tdn} font-bold`}>{num(bs.assetTotal.opening)}</td>
                <td className={`${tdn} font-bold`}>{num(bs.assetTotal.closing)}</td>
              </tr>
            </tbody>
          </table>
          <table className="w-full border-collapse self-start">
            <thead>
              <tr>
                <th className={th}>負債・資本の部</th>
                <th className={th}>1月1日（期首）</th>
                <th className={th}>12月31日（期末）</th>
              </tr>
            </thead>
            <tbody>
              {bs.liabilities.map((r) => (
                <tr key={r.code}>
                  <td className={td}>{r.name}</td>
                  <td className={tdn}>{r.code === "2900" ? "" : num(r.opening)}</td>
                  <td className={tdn}>{num(r.closing)}</td>
                </tr>
              ))}
              <tr>
                <td className={td}>元入金</td>
                <td className={tdn}>{num(bs.capital.opening)}</td>
                <td className={tdn}>{num(bs.capital.closing)}</td>
              </tr>
              <tr>
                <td className={td}>青色申告特別控除前の所得金額</td>
                <td className={td} />
                <td className={tdn}>{num(bs.incomeBeforeDeduction)}</td>
              </tr>
              <tr>
                <td className={`${td} font-bold`}>合計</td>
                <td className={`${tdn} font-bold`}>{num(bs.liabilityTotal.opening)}</td>
                <td className={`${tdn} font-bold`}>{num(bs.liabilityTotal.closing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {bs.diff !== 0 && <p className="mt-2 text-[11px] text-red-700">※ 貸借差額 {num(bs.diff)} 円があります。</p>}
      </Sheet>
    </div>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="print-sheet page-break mx-auto mb-4 max-w-[210mm] bg-white p-[12mm] text-slate-900 shadow first:break-before-auto">
      {children}
    </div>
  );
}

function Title({ year, page, name }: { year: number; page: string; name: string }) {
  return (
    <div className="flex items-baseline justify-between border-b-2 border-slate-800 pb-1">
      <h2 className="text-[15px] font-bold">
        {reiwa(year)}分 青色申告決算書（一般用）資料 — {name}
      </h2>
      <span className="text-[10px] text-slate-500">{page} / 4</span>
    </div>
  );
}

function Header({ profile }: { profile: ReturnType<typeof useData>["profile"] }) {
  return (
    <table className="mt-2 w-full border-collapse text-[11px]">
      <tbody>
        <tr>
          <th className={`${th} w-24`}>住所</th>
          <td className={td} colSpan={3}>
            {profile.address}
          </td>
        </tr>
        <tr>
          <th className={th}>氏名</th>
          <td className={td}>{profile.owner_name}</td>
          <th className={`${th} w-24`}>屋号</th>
          <td className={td}>{profile.trade_name}</td>
        </tr>
        <tr>
          <th className={th}>業種名</th>
          <td className={td}>害虫駆除業</td>
          <th className={th}>電話</th>
          <td className={td}>{profile.phone}</td>
        </tr>
      </tbody>
    </table>
  );
}
