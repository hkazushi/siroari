"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileText } from "lucide-react";
import { Button, Card, Empty, LinkButton, PageHeader, Segmented, Select, YearSelect } from "@/components/ui";
import { ACCOUNTS, accountName } from "@/lib/accounts";
import { downloadCsv } from "@/lib/csv";
import { useData } from "@/lib/data";
import { generalLedger } from "@/lib/ledger";
import { shortDate, yen } from "@/lib/format";
import { SIMPLIFIED_CATEGORIES, TAX_METHOD_LABELS } from "@/lib/tax";
import { useBooks } from "@/lib/useBooks";
import { useYear } from "@/lib/year";

type Tab = "monthly" | "pl" | "bs" | "journal" | "ledger" | "tax";

export default function ReportsPage() {
  const { year, setYear, years } = useYear();
  const [tab, setTab] = useState<Tab>("pl");
  const data = useBooks(year);

  return (
    <div>
      <PageHeader
        title="決算・帳簿"
        description="取引から自動作成。青色申告（65万円控除）に必要な仕訳帳・総勘定元帳・決算書がそろいます"
        actions={
          <>
            <YearSelect value={year} onChange={setYear} years={years} />
            <LinkButton href="/reports/blue-return">
              <FileText size={15} /> 青色申告決算書の資料
            </LinkButton>
          </>
        }
      />
      <div className="-mx-4 mb-3 overflow-x-auto px-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "pl", label: "損益計算書" },
            { value: "bs", label: "貸借対照表" },
            { value: "monthly", label: "月次推移" },
            { value: "journal", label: "仕訳帳" },
            { value: "ledger", label: "総勘定元帳" },
            { value: "tax", label: "消費税" },
          ]}
        />
      </div>
      {tab === "pl" && <PLView year={year} data={data} />}
      {tab === "bs" && <BSView year={year} data={data} />}
      {tab === "monthly" && <MonthlyView year={year} data={data} />}
      {tab === "journal" && <JournalView year={year} data={data} />}
      {tab === "ledger" && <LedgerView year={year} data={data} />}
      {tab === "tax" && <TaxView year={year} data={data} />}
    </div>
  );
}

type Data = ReturnType<typeof useBooks>;

function Row({ label, value, strong, indent }: { label: string; value: number; strong?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between px-4 py-1.5 text-sm ${strong ? "bg-slate-50 font-bold" : ""}`}>
      <span className={indent ? "pl-3 text-slate-700" : ""}>{label}</span>
      <span className={`tabular-nums ${value < 0 ? "text-red-700" : ""}`}>{yen(value)}</span>
    </div>
  );
}

function PLView({ year, data }: { year: number; data: Data }) {
  const { pl } = data;
  function exportCsv() {
    downloadCsv(`損益計算書_${year}.csv`, [
      ["科目", "金額"],
      ...pl.revenue.map((r) => [r.name, r.amount]),
      ["売上（収入）金額 計", pl.revenueTotal],
      ["仕入高（売上原価）", pl.cogs],
      ...pl.expenses.filter((e) => e.amount).map((e) => [e.name, e.amount]),
      ["経費 計", pl.expenseTotal],
      ["青色申告特別控除前の所得金額", pl.incomeBeforeDeduction],
      ["青色申告特別控除額", pl.blueDeduction],
      ["所得金額", pl.income],
    ]);
  }
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold">{year}年 1月1日〜12月31日</h2>
        <Button size="sm" variant="secondary" onClick={exportCsv}>
          <Download size={14} /> CSV
        </Button>
      </div>
      <div className="divide-y divide-slate-50 py-1">
        {pl.revenue.map((r) => (
          <Row key={r.code} label={r.name} value={r.amount} indent />
        ))}
        <Row label="売上（収入）金額" value={pl.revenueTotal} strong />
        {pl.cogs > 0 && <Row label="仕入高（売上原価）" value={pl.cogs} indent />}
        {pl.expenses
          .filter((e) => e.amount !== 0)
          .map((e) => (
            <Row key={e.code} label={e.name} value={e.amount} indent />
          ))}
        <Row label="経費 計" value={pl.expenseTotal} strong />
        <Row label="青色申告特別控除前の所得金額" value={pl.incomeBeforeDeduction} strong />
        <Row label="青色申告特別控除額" value={pl.blueDeduction} indent />
        <Row label="所得金額" value={pl.income} strong />
      </div>
    </Card>
  );
}

function BSView({ year, data }: { year: number; data: Data }) {
  const { bs, books } = data;
  const side = (rows: typeof bs.assets) =>
    rows.map((r) => (
      <tr key={r.code}>
        <td className="px-4 py-1.5">{r.name}</td>
        <td className="px-4 py-1.5 text-right tabular-nums">{yen(r.opening)}</td>
        <td className="px-4 py-1.5 text-right tabular-nums">{yen(r.closing)}</td>
      </tr>
    ));
  const head = (
    <thead className="bg-slate-50 text-xs text-slate-500">
      <tr>
        <th className="px-4 py-2 text-left">科目</th>
        <th className="px-4 py-2 text-right">1月1日（期首）</th>
        <th className="px-4 py-2 text-right">12月31日（期末）</th>
      </tr>
    </thead>
  );
  return (
    <div className="space-y-3">
      {!books.openingIsManual && (
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          期首残高は前年から自動で繰り越しています（データが無い年は 0 円）。開業時・アプリ利用開始時の預金残高などは「設定 → 期首残高」で入力してください。
        </p>
      )}
      {bs.diff !== 0 && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">貸借が {yen(bs.diff)} 一致していません。</p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold">資産の部</h2>
          <table className="w-full text-sm">
            {head}
            <tbody className="divide-y divide-slate-50">{side(bs.assets)}</tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="px-4 py-2">合計</td>
                <td className="px-4 py-2 text-right tabular-nums">{yen(bs.assetTotal.opening)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{yen(bs.assetTotal.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold">負債・資本の部</h2>
          <table className="w-full text-sm">
            {head}
            <tbody className="divide-y divide-slate-50">
              {side(bs.liabilities)}
              <tr>
                <td className="px-4 py-1.5">元入金</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{yen(bs.capital.opening)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{yen(bs.capital.closing)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1.5">青色申告特別控除前の所得金額</td>
                <td className="px-4 py-1.5 text-right">—</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{yen(bs.incomeBeforeDeduction)}</td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="px-4 py-2">合計</td>
                <td className="px-4 py-2 text-right tabular-nums">{yen(bs.liabilityTotal.opening)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{yen(bs.liabilityTotal.closing)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
      <p className="text-[11px] text-slate-500">
        事業主貸・事業主借は翌年 1 月 1 日に元入金へ振り替えられます（元入金 ＝ 期首の資産 − 負債）。{year + 1}年の期首に自動反映されます。
      </p>
    </div>
  );
}

function MonthlyView({ year, data }: { year: number; data: Data }) {
  const { months } = data;
  const rows = months.map((m, i) => ({
    ...m,
    profit: m.revenue - m.expense,
    cum: months.slice(0, i + 1).reduce((s, x) => s + x.revenue - x.expense, 0),
  }));
  const cum = rows[rows.length - 1]?.cum ?? 0;
  return (
    <Card className="overflow-x-auto">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold">{year}年 月次推移（事業分・減価償却は 12 月）</h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            downloadCsv(`月次推移_${year}.csv`, [
              ["月", "売上", "経費", "差引", "累計"],
              ...rows.map((r) => [`${r.month}月`, r.revenue, r.expense, r.profit, r.cum]),
            ])
          }
        >
          <Download size={14} /> CSV
        </Button>
      </div>
      <table className="w-full min-w-[480px] text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">月</th>
            <th className="px-4 py-2 text-right">売上</th>
            <th className="px-4 py-2 text-right">経費</th>
            <th className="px-4 py-2 text-right">差引</th>
            <th className="px-4 py-2 text-right">累計</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((r) => (
            <tr key={r.month}>
              <td className="px-4 py-1.5">{r.month}月</td>
              <td className="px-4 py-1.5 text-right tabular-nums">{yen(r.revenue)}</td>
              <td className="px-4 py-1.5 text-right tabular-nums">{yen(r.expense)}</td>
              <td className={`px-4 py-1.5 text-right tabular-nums ${r.profit < 0 ? "text-red-700" : ""}`}>{yen(r.profit)}</td>
              <td className={`px-4 py-1.5 text-right tabular-nums ${r.cum < 0 ? "text-red-700" : ""}`}>{yen(r.cum)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-bold">
          <tr>
            <td className="px-4 py-2">合計</td>
            <td className="px-4 py-2 text-right tabular-nums">{yen(rows.reduce((s, r) => s + r.revenue, 0))}</td>
            <td className="px-4 py-2 text-right tabular-nums">{yen(rows.reduce((s, r) => s + r.expense, 0))}</td>
            <td className="px-4 py-2 text-right tabular-nums">{yen(cum)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

function JournalView({ year, data }: { year: number; data: Data }) {
  const { entries } = data.books;
  const [limit, setLimit] = useState(200);
  function exportCsv() {
    const rows: (string | number)[][] = [["日付", "借方科目", "借方金額", "貸方科目", "貸方金額", "摘要", "取引先"]];
    for (const e of entries) {
      const dr = e.lines.filter((l) => l.dr);
      const cr = e.lines.filter((l) => l.cr);
      const n = Math.max(dr.length, cr.length);
      for (let i = 0; i < n; i++) {
        rows.push([
          i === 0 ? e.date : "",
          dr[i] ? accountName(dr[i].code) : "",
          dr[i]?.dr ?? "",
          cr[i] ? accountName(cr[i].code) : "",
          cr[i]?.cr ?? "",
          i === 0 ? e.memo : "",
          i === 0 ? e.partner : "",
        ]);
      }
    }
    downloadCsv(`仕訳帳_${year}.csv`, rows);
  }
  return (
    <Card className="overflow-x-auto">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold">仕訳帳（{entries.length} 件）</h2>
        <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!entries.length}>
          <Download size={14} /> CSV
        </Button>
      </div>
      {entries.length === 0 ? (
        <Empty>仕訳がありません</Empty>
      ) : (
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">日付</th>
              <th className="px-3 py-2 text-left">借方</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2 text-left">貸方</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2 text-left">摘要</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.slice(0, limit).map((e, idx) => {
              const dr = e.lines.filter((l) => l.dr);
              const cr = e.lines.filter((l) => l.cr);
              const n = Math.max(dr.length, cr.length);
              return Array.from({ length: n }, (_, i) => (
                <tr key={`${idx}-${i}`} className={i > 0 ? "border-t-0" : ""}>
                  <td className="px-3 py-1 text-xs tabular-nums">{i === 0 ? shortDate(e.date) : ""}</td>
                  <td className="px-3 py-1">{dr[i] ? accountName(dr[i].code) : ""}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{dr[i] ? yen(dr[i].dr) : ""}</td>
                  <td className="px-3 py-1">{cr[i] ? accountName(cr[i].code) : ""}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{cr[i] ? yen(cr[i].cr) : ""}</td>
                  <td className="max-w-[16rem] truncate px-3 py-1 text-xs text-slate-600">
                    {i === 0 ? [e.partner, e.memo].filter(Boolean).join(" ") : ""}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      )}
      {entries.length > limit && (
        <div className="p-3 text-center">
          <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + 500)}>
            さらに表示（残り {entries.length - limit} 件）
          </Button>
        </div>
      )}
    </Card>
  );
}

function LedgerView({ year, data }: { year: number; data: Data }) {
  const [code, setCode] = useState("1110");
  const ledger = useMemo(() => generalLedger(data.books, code), [data.books, code]);
  return (
    <Card className="overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold">総勘定元帳</h2>
        <Select value={code} onChange={(e) => setCode(e.target.value)} className="w-auto">
          {ACCOUNTS.map((a) => (
            <option key={a.code} value={a.code}>
              {a.name}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          onClick={() =>
            downloadCsv(`総勘定元帳_${accountName(code)}_${year}.csv`, [
              ["日付", "相手科目", "摘要", "取引先", "借方", "貸方", "残高"],
              ["", "", "前期繰越", "", "", "", ledger.opening],
              ...ledger.rows.map((r) => [r.date, r.counter, r.memo, r.partner, r.dr || "", r.cr || "", r.balance]),
            ])
          }
        >
          <Download size={14} /> CSV
        </Button>
      </div>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">日付</th>
            <th className="px-3 py-2 text-left">相手科目</th>
            <th className="px-3 py-2 text-left">摘要</th>
            <th className="px-3 py-2 text-right">借方</th>
            <th className="px-3 py-2 text-right">貸方</th>
            <th className="px-3 py-2 text-right">残高</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <tr className="text-slate-500">
            <td className="px-3 py-1.5" />
            <td className="px-3 py-1.5" colSpan={4}>
              前期繰越
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{yen(ledger.opening)}</td>
          </tr>
          {ledger.rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-1.5 text-xs tabular-nums">{shortDate(r.date)}</td>
              <td className="px-3 py-1.5">{r.counter}</td>
              <td className="max-w-[16rem] truncate px-3 py-1.5 text-xs text-slate-600">
                {[r.partner, r.memo].filter(Boolean).join(" ")}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.dr ? yen(r.dr) : ""}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{r.cr ? yen(r.cr) : ""}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.balance < 0 ? "text-red-700" : ""}`}>{yen(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {ledger.rows.some((r) => r.balance < 0) && ["1100", "1110"].includes(code) && (
        <p className="border-t border-slate-100 p-3 text-xs text-red-700">
          残高がマイナスになっています。期首残高の入力漏れか、事業主借（個人のお金）での支払いの可能性があります。
        </p>
      )}
    </Card>
  );
}

function TaxView({ year, data }: { year: number; data: Data }) {
  const { profile } = useData();
  const { tax } = data;
  const cat = SIMPLIFIED_CATEGORIES.find((c) => c.id === profile.simplified_category);
  if (profile.tax_status === "exempt") {
    return (
      <Card className="space-y-2 p-4 text-sm">
        <p>
          <b>免税事業者</b>として設定されています（消費税の申告は不要）。
        </p>
        <p className="text-slate-600">
          {year}年の課税売上高（税抜）は <b>{yen(tax.taxableSalesExcl)}</b> です。
          {tax.taxableSalesExcl > 10_000_000
            ? "1,000 万円を超えているため、2 年後（" + (year + 2) + "年）は課税事業者になります。"
            : "1,000 万円以下なら 2 年後も免税のままです（インボイス登録をした場合を除く）。"}
        </p>
        <p className="text-xs text-slate-500">インボイス登録をした場合は「設定」で課税事業者に切り替えてください。</p>
      </Card>
    );
  }
  const r = (label: string, v: number, strong = false) => (
    <div className={`flex justify-between px-4 py-1.5 text-sm ${strong ? "bg-slate-50 font-bold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{yen(v)}</span>
    </div>
  );
  return (
    <div className="space-y-3">
      <Card>
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-bold">
          {year}年分 消費税の概算 ／ {TAX_METHOD_LABELS[tax.method]}
          {tax.method === "simplified" && cat && `（${cat.label}）`}
        </h2>
        <div className="divide-y divide-slate-50 py-1">
          {r("課税売上（10%・税込）", tax.sales10)}
          {r("課税売上（8%・税込）", tax.sales8)}
          {r("課税標準額（千円未満切捨）", tax.base10 + tax.base8)}
          {r("売上に係る消費税額（国税）", tax.outputTax)}
          {tax.method === "general" && r("課税仕入（10%・税込）", tax.purchases10)}
          {tax.method === "general" && r("課税仕入（8%・税込）", tax.purchases8)}
          {r(
            tax.method === "general" ? "控除対象仕入税額" : tax.method === "simplified" ? "控除対象仕入税額（みなし仕入率）" : "特別控除税額（売上税額の 8 割）",
            tax.inputTax,
          )}
          {r("差引税額（国税・百円未満切捨）", tax.national)}
          {r("地方消費税（国税の 22/78）", tax.local)}
          {r("納付税額の目安", tax.total, true)}
        </div>
      </Card>
      {tax.method === "twenty_percent" && !tax.twentyPercentAvailable && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
          2割特例は 2026 年分までです。{year}年分は簡易課税（届出が必要）か一般課税を選んでください。
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">
        税込経理・割戻し計算による概算です。中間納付・貸倒れ・返品・課税仕入の区分などは反映していません。
        申告書は国税庁の確定申告書等作成コーナーで作成してください（{year + 1}年 3 月 31 日期限）。
        納付した消費税は、納付した年の「租税公課」として経費になります。
      </p>
    </div>
  );
}
