"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, YearSelect } from "@/components/ui";
import { ASSET_ACCOUNTS_FOR_FIXED, WALLETS, accountName, type Wallet } from "@/lib/accounts";
import { LIFE_PRESETS, METHOD_LABELS, depreciationSchedule } from "@/lib/depreciation";
import { useData } from "@/lib/data";
import { jpDate, parseAmount, today, yen } from "@/lib/format";
import type { DepMethod, FixedAsset, FixedAssetInput } from "@/lib/types";
import { useYear } from "@/lib/year";
import { stripMeta } from "@/lib/utils";

export default function AssetsPage() {
  const { assets } = useData();
  const { year, setYear, years } = useYear();
  const [editing, setEditing] = useState<FixedAsset | "new" | null>(null);
  const rows = assets
    .map((a) => depreciationSchedule(a, year))
    .filter((r) => r.acquired > 0 || r.opening > 0 || r.depreciation > 0 || r.disposed > 0 || r.closing > 0);
  const others = assets.filter((a) => !rows.some((r) => r.asset.id === a.id));
  const sum = (k: "opening" | "acquired" | "depreciation" | "businessPortion" | "closing") =>
    rows.reduce((s, r) => s + r[k], 0);

  return (
    <div>
      <PageHeader
        title="固定資産・減価償却"
        description="10万円以上の車・機材などを登録すると、毎年の減価償却費が 12/31 付で自動計上されます"
        actions={
          <>
            <YearSelect value={year} onChange={setYear} years={years} />
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> 資産を登録
            </Button>
          </>
        }
      />
      <Card className="mb-3 p-3 text-xs leading-relaxed text-slate-600">
        <b>判定の目安</b>：10万円未満 → 経費（消耗品費）で取引登録 ／ 10万〜20万円未満 → 一括償却資産（3年均等）も選べる ／
        30万円未満 → 青色申告なら少額減価償却資産の特例で全額その年の経費にできる（年合計300万円まで） ／ それ以上 → 定額法で耐用年数に応じて償却
      </Card>
      <Card className="overflow-x-auto">
        {rows.length === 0 && others.length === 0 ? (
          <Empty>固定資産はありません</Empty>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">資産</th>
                <th className="px-3 py-2 text-left">取得日</th>
                <th className="px-3 py-2 text-right">取得価額</th>
                <th className="px-3 py-2 text-left">方法・耐用年数</th>
                <th className="px-3 py-2 text-right">期首帳簿価額</th>
                <th className="px-3 py-2 text-right">本年償却費</th>
                <th className="px-3 py-2 text-right">うち経費算入</th>
                <th className="px-3 py-2 text-right">期末帳簿価額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.asset.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setEditing(r.asset)}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.asset.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {accountName(r.asset.account_code)}
                      {r.asset.business_ratio < 100 && ` ・ 事業${r.asset.business_ratio}%`}
                      {r.disposed > 0 && " ・ 本年除却"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{jpDate(r.asset.acquired_date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(r.asset.cost)}</td>
                  <td className="px-3 py-2 text-xs">
                    {METHOD_LABELS[r.asset.method]}
                    {r.asset.method === "straight" && ` ${r.asset.useful_life}年（${r.rate}）${r.months}か月`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(r.opening)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(r.depreciation)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{yen(r.businessPortion)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(r.closing)}</td>
                </tr>
              ))}
              {others.map((a) => (
                <tr key={a.id} className="cursor-pointer text-slate-400 hover:bg-slate-50" onClick={() => setEditing(a)}>
                  <td className="px-3 py-2" colSpan={8}>
                    {a.name}（{jpDate(a.acquired_date)} 取得）<Badge>{year}年は対象外（償却済・除却済・未取得）</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
                <tr>
                  <td className="px-3 py-2" colSpan={4}>
                    合計
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(sum("opening"))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(sum("depreciation"))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(sum("businessPortion"))}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{yen(sum("closing"))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </Card>
      {editing && <AssetDialog asset={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function AssetDialog({ asset, onClose }: { asset: FixedAsset | null; onClose: () => void }) {
  const { addAsset, updateAsset, deleteAsset } = useData();
  const [form, setForm] = useState<FixedAssetInput>(() =>
    asset
      ? stripMeta(asset)
      : {
          name: "",
          account_code: "1530",
          acquired_date: today(),
          cost: 0,
          useful_life: 4,
          method: "straight",
          business_ratio: 100,
          paid_from: "bank",
          disposed_date: null,
          notes: "",
        },
  );
  const [costText, setCostText] = useState(form.cost ? String(form.cost) : "");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FixedAssetInput>(k: K, v: FixedAssetInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const cost = parseAmount(costText);

  function onCost(text: string) {
    setCostText(text);
    const c = parseAmount(text);
    // 金額から方法を提案（新規のみ）
    if (!asset && c > 0) {
      if (c < 200000 && form.method === "straight" && c >= 100000) set("method", "lump_sum_3y");
      if (c >= 200000 && c < 300000 && form.method === "lump_sum_3y") set("method", "small_amount");
      if (c >= 300000 && form.method !== "straight") set("method", "straight");
    }
  }

  const preview = cost > 0 && form.acquired_date ? depreciationSchedule({ ...form, cost, id: "preview" }, Number(form.acquired_date.slice(0, 4))) : null;

  async function save() {
    if (!form.name.trim() || cost <= 0) return;
    if (form.method === "lump_sum_3y" && cost >= 200000) {
      alert("一括償却資産は 20 万円未満の資産だけが対象です");
      return;
    }
    if (form.method === "small_amount" && cost >= 300000) {
      alert("少額減価償却資産の特例は 30 万円未満の資産だけが対象です");
      return;
    }
    setBusy(true);
    try {
      const data = { ...form, cost, account_code: form.method === "lump_sum_3y" ? "1550" : form.account_code };
      if (asset) await updateAsset(asset.id, data);
      else await addAsset(data);
      onClose();
    } catch (e) {
      alert(`保存できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }
  async function remove() {
    if (!asset || !confirm(`「${asset.name}」を削除しますか？過去の年の償却費も消えます。売却・廃棄した場合は「除却日」を入れてください。`)) return;
    setBusy(true);
    try {
      await deleteAsset(asset.id);
      onClose();
    } catch (e) {
      alert(`削除できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={asset ? "固定資産を編集" : "固定資産を登録"}
      footer={
        <>
          {asset && (
            <Button variant="ghost" className="mr-auto text-red-700" onClick={remove} disabled={busy}>
              <Trash2 size={15} /> 削除
            </Button>
          )}
          <Button onClick={save} disabled={busy || !form.name.trim() || cost <= 0}>
            {busy ? <Spinner /> : "保存"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="名称">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例: 軽トラック / 動力噴霧器" />
        </Field>
        <Field label="プリセット（選ぶと科目と耐用年数が入ります）">
          <Select
            value=""
            onChange={(e) => {
              const p = LIFE_PRESETS[Number(e.target.value)];
              if (p) setForm((f) => ({ ...f, account_code: p.account, useful_life: p.life, method: "straight" }));
            }}
          >
            <option value="">選択してください</option>
            {LIFE_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="取得日（使い始めた日）">
            <Input type="date" value={form.acquired_date} onChange={(e) => set("acquired_date", e.target.value)} />
          </Field>
          <Field label="取得価額（税込）">
            <Input inputMode="numeric" value={costText} onChange={(e) => onCost(e.target.value)} className="text-right" />
          </Field>
        </div>
        <Field label="償却方法">
          <Select value={form.method} onChange={(e) => set("method", e.target.value as DepMethod)}>
            {(Object.keys(METHOD_LABELS) as DepMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        {form.method === "straight" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="勘定科目">
              <Select value={form.account_code} onChange={(e) => set("account_code", e.target.value)}>
                {ASSET_ACCOUNTS_FOR_FIXED.filter((a) => a.code !== "1550").map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="耐用年数">
              <Input
                type="number"
                min={2}
                max={50}
                value={form.useful_life}
                onChange={(e) => set("useful_life", Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="支払方法">
            <Select value={form.paid_from} onChange={(e) => set("paid_from", e.target.value as Wallet)}>
              {WALLETS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`事業で使う割合: ${form.business_ratio}%`}>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={form.business_ratio}
              onChange={(e) => set("business_ratio", Number(e.target.value))}
              className="mt-2 w-full accent-[#1e3a5f]"
            />
          </Field>
        </div>
        <Field label="除却日（売却・廃棄した場合）" hint="売却した場合、売却代金は譲渡所得になるため別途計算が必要です">
          <Input type="date" value={form.disposed_date ?? ""} onChange={(e) => set("disposed_date", e.target.value || null)} />
        </Field>
        <Field label="メモ">
          <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        {preview && (
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            取得年（{form.acquired_date.slice(0, 4)}年）の償却費 <b>{yen(preview.depreciation)}</b>
            {form.business_ratio < 100 && `（経費算入 ${yen(preview.businessPortion)}）`}
            {form.method === "straight" && ` ／ 償却率 ${preview.rate} × ${preview.months}か月`}
            <br />
            ※ 取得の支払いは自動で仕訳されます。取引画面で同じ支払いを経費登録しないでください。
          </p>
        )}
      </div>
    </Modal>
  );
}
