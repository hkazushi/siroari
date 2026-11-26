"use client";

import { useState } from "react";
import { Download, LogOut } from "lucide-react";
import { Button, Card, Field, Input, PageHeader, Select, Spinner, Textarea, YearSelect } from "@/components/ui";
import { OPENING_ACCOUNTS } from "@/lib/accounts";
import { downloadBlob } from "@/lib/csv";
import { useData } from "@/lib/data";
import { num, parseAmount, today, yen } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { SIMPLIFIED_CATEGORIES, TAX_METHOD_LABELS } from "@/lib/tax";
import type { BusinessProfile, TaxMethod, TaxStatus } from "@/lib/types";
import { useYear } from "@/lib/year";

export default function SettingsPage() {
  const data = useData();
  const { profile, saveProfile, session } = data;
  const { years } = useYear();
  const [form, setForm] = useState<BusinessProfile>(profile);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [obYear, setObYear] = useState(() => {
    const ys = Object.keys(profile.opening_balances ?? {}).map(Number);
    return ys.length ? Math.min(...ys) : Math.min(...years);
  });
  const [obText, setObText] = useState<Record<string, string>>(() => toText(profile.opening_balances?.[obYear]));
  const set = <K extends keyof BusinessProfile>(k: K, v: BusinessProfile[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  function toText(b: Record<string, number> | undefined): Record<string, string> {
    return Object.fromEntries(Object.entries(b ?? {}).map(([k, v]) => [k, v ? String(v) : ""]));
  }

  function changeObYear(y: number) {
    setObYear(y);
    setObText(toText(form.opening_balances?.[y]));
  }

  const obValues = Object.fromEntries(
    Object.entries(obText)
      .map(([k, v]) => [k, parseAmount(v)] as const)
      .filter(([, v]) => v !== 0),
  );
  const obAssets = OPENING_ACCOUNTS.filter((a) => a.type === "asset").reduce((s, a) => s + (obValues[a.code] ?? 0), 0);
  const obLiab = OPENING_ACCOUNTS.filter((a) => a.type === "liability").reduce((s, a) => s + (obValues[a.code] ?? 0), 0);

  async function save() {
    const invoiceNo = form.invoice_number.trim().toUpperCase().replace(/[^T\d]/g, "");
    if (invoiceNo && !/^T\d{13}$/.test(invoiceNo)) {
      alert("インボイス登録番号は「T」＋13桁の数字です");
      return;
    }
    const opening = { ...(form.opening_balances ?? {}) };
    if (Object.keys(obValues).length) opening[obYear] = obValues;
    else delete opening[obYear];
    setBusy(true);
    try {
      const next = { ...form, invoice_number: invoiceNo, opening_balances: opening };
      await saveProfile(next);
      setForm(next);
      setSaved(true);
    } catch (e) {
      alert(`保存できませんでした: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  function backup() {
    const json = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        profile: data.profile,
        partners: data.partners,
        transactions: data.transactions,
        invoices: data.invoices,
        fixed_assets: data.assets,
      },
      null,
      2,
    );
    downloadBlob(`会計アプリ_バックアップ_${today()}.json`, new Blob([json], { type: "application/json" }));
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="設定"
        actions={
          <Button onClick={save} disabled={busy}>
            {busy ? <Spinner /> : saved ? "保存しました" : "保存"}
          </Button>
        }
      />

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="text-sm font-bold">事業者情報（請求書・決算書に表示）</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="屋号">
            <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
          </Field>
          <Field label="氏名（事業主）">
            <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
          </Field>
        </div>
        <Field label="住所">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="電話">
            <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="メール">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
        </div>
        <Field label="振込先（請求書に印字）">
          <Textarea
            rows={2}
            value={form.bank_info}
            onChange={(e) => set("bank_info", e.target.value)}
            placeholder="例: 〇〇銀行 △△支店 普通 1234567 ヒガシヤマメンテナンス"
          />
        </Field>
      </Card>

      <Card className="mb-4 space-y-3 p-4">
        <h2 className="text-sm font-bold">税金の設定</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="青色申告特別控除" hint="e-Tax＋複式簿記なら 65 万円、紙提出なら 55 万円">
            <Select value={form.blue_deduction} onChange={(e) => set("blue_deduction", Number(e.target.value))}>
              <option value={650000}>65万円（e-Tax で提出）</option>
              <option value={550000}>55万円（紙で提出）</option>
              <option value={100000}>10万円（簡易帳簿）</option>
              <option value={0}>なし（白色申告）</option>
            </Select>
          </Field>
          <Field label="消費税" hint="インボイス（適格請求書発行事業者）登録をしたら課税事業者">
            <Select value={form.tax_status} onChange={(e) => set("tax_status", e.target.value as TaxStatus)}>
              <option value="exempt">免税事業者</option>
              <option value="taxable">課税事業者（インボイス登録済み）</option>
            </Select>
          </Field>
        </div>
        {form.tax_status === "taxable" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="インボイス登録番号">
              <Input
                value={form.invoice_number}
                onChange={(e) => set("invoice_number", e.target.value)}
                placeholder="T1234567890123"
              />
            </Field>
            <Field label="計算方法" hint="免税から登録した個人は 2026 年分まで 2割特例が使えます">
              <Select value={form.tax_method} onChange={(e) => set("tax_method", e.target.value as TaxMethod)}>
                {(Object.keys(TAX_METHOD_LABELS) as TaxMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {TAX_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            {form.tax_method === "simplified" && (
              <Field label="簡易課税の事業区分" hint="害虫駆除などのサービス業は通常 第5種">
                <Select value={form.simplified_category} onChange={(e) => set("simplified_category", Number(e.target.value))}>
                  {SIMPLIFIED_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Card>

      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">期首残高（1月1日時点）</h2>
          <YearSelect value={obYear} onChange={changeObYear} years={years} />
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          アプリを使い始めた年の 1 月 1 日時点の残高を入れます（開業した年なら開業日時点）。翌年以降は自動で繰り越されるので入力不要です。
          前年の青色申告決算書がある場合は、その「12月31日」欄の金額を入れてください。
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OPENING_ACCOUNTS.map((a) => (
            <label key={a.code} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-slate-600">
                {a.name}
                {a.type === "liability" && <span className="text-slate-400">（負債）</span>}
              </span>
              <Input
                inputMode="numeric"
                className="text-right tabular-nums"
                value={obText[a.code] ?? ""}
                onChange={(e) => {
                  setObText((t) => ({ ...t, [a.code]: e.target.value }));
                  setSaved(false);
                }}
                placeholder="0"
              />
            </label>
          ))}
        </div>
        <p className="text-sm">
          元入金（自動計算）: <b className="tabular-nums">{yen(obAssets - obLiab)}</b>
          <span className="ml-2 text-xs text-slate-500">
            ＝ 資産 {num(obAssets)} − 負債 {num(obLiab)}
          </span>
        </p>
      </Card>


      <Card className="mb-4 space-y-3 p-4">
        <h2 className="text-sm font-bold">データ</h2>
        <p className="text-xs text-slate-600">
          帳簿書類は 7 年間の保存義務があります。年に一度はバックアップを保存してください。各帳簿の CSV は「決算・帳簿」から出力できます。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={backup}>
            <Download size={15} /> すべてのデータをバックアップ（JSON）
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("ログアウトしますか？")) void supabase().auth.signOut();
            }}
          >
            <LogOut size={15} /> ログアウト（{session.user.email}）
          </Button>
        </div>
      </Card>
    </div>
  );
}
