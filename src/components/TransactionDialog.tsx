"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Camera, ImageIcon, Mic, MicOff, Sparkles, Trash2 } from "lucide-react";
import {
  EXPENSE_ACCOUNTS,
  REVENUE_ACCOUNTS,
  TRANSFER_ACCOUNTS,
  WALLETS,
  account,
  type Wallet,
} from "@/lib/accounts";
import { removeReceipt, uploadReceipt, useData } from "@/lib/data";
import { parseAmount, today, yen } from "@/lib/format";
import { compressImage } from "@/lib/image";
import type { ReceiptEntry, TaxRate, Transaction, TransactionInput, TxKind } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { ReceiptThumb } from "./Receipt";
import { stripMeta } from "@/lib/utils";
import { Button, Field, Input, Modal, Segmented, Select, Spinner, Textarea } from "./ui";

// ---------------------------------------------------------------------
// どの画面からでも「取引を登録」を開けるようにするコンテキスト
// ---------------------------------------------------------------------

interface TxDialogCtx {
  openNew: (preset?: Partial<TransactionInput>) => void;
  openEdit: (tx: Transaction) => void;
}
const Ctx = createContext<TxDialogCtx | null>(null);

export function useTxDialog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("TxDialogProvider がありません");
  return v;
}

export function TxDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ key: number; tx: Transaction | null; preset?: Partial<TransactionInput> } | null>(
    null,
  );
  const openNew = useCallback((preset?: Partial<TransactionInput>) => setState({ key: Date.now(), tx: null, preset }), []);
  const openEdit = useCallback((tx: Transaction) => setState({ key: Date.now(), tx }), []);
  const value = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {state && (
        <TransactionDialog key={state.key} tx={state.tx} preset={state.preset} onClose={() => setState(null)} />
      )}
    </Ctx.Provider>
  );
}

// ---------------------------------------------------------------------

const KIND_OPTIONS: { value: TxKind; label: string }[] = [
  { value: "expense", label: "経費" },
  { value: "income", label: "売上" },
  { value: "transfer", label: "振替" },
];

function blank(kind: TxKind = "expense"): TransactionInput {
  return {
    kind,
    date: today(),
    amount: 0,
    account_code: kind === "income" ? "4100" : kind === "expense" ? "6190" : "1100",
    from_code: kind === "transfer" ? "1110" : null,
    wallet: kind === "income" ? "bank" : "cash",
    status: "paid",
    paid_date: null,
    tax_rate: 10,
    partner_id: null,
    partner_name: "",
    memo: "",
    receipt_path: null,
    invoice_id: null,
    business_ratio: 100,
  };
}

interface AiResult {
  kind?: TxKind;
  date?: string;
  amount?: number;
  account_code?: string;
  tax_rate?: number;
  partner_name?: string;
  memo?: string;
  wallet?: Wallet;
  invoice_number?: string;
}

function TransactionDialog({
  tx,
  preset,
  onClose,
}: {
  tx: Transaction | null;
  preset?: Partial<TransactionInput>;
  onClose: () => void;
}) {
  const { session, partners, addTransaction, updateTransaction, deleteTransaction, callApi, transactions } = useData();
  const [form, setForm] = useState<TransactionInput>(() => {
    if (tx) return stripMeta(tx);
    return { ...blank(preset?.kind), ...preset };
  });
  const [amountText, setAmountText] = useState(form.amount ? String(form.amount) : "");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<null | "receipt" | "text">(null);
  const [aiText, setAiText] = useState("");
  const [aiNote, setAiNote] = useState<string | null>(null);
  // このダイアログで新しく保存した領収書（保存せずに閉じたら消す）
  const uploadedRef = useRef<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof TransactionInput>(k: K, v: TransactionInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  /** 保存せずに閉じる: このダイアログで上げた領収書は消す */
  function cancel() {
    const p = uploadedRef.current;
    if (p && p !== tx?.receipt_path) void removeReceipt(p).catch(() => {});
    onClose();
  }

  const voice = useVoiceInput({
    onFinal: (t) => setAiText((s) => (s ? `${s} ${t}` : t).trim()),
  });

  function changeKind(kind: TxKind) {
    const b = blank(kind);
    setForm((f) => ({
      ...f,
      kind,
      account_code: b.account_code,
      from_code: b.from_code,
      wallet: b.wallet,
      tax_rate: kind === "transfer" ? 0 : (account(b.account_code).taxRate ?? 10),
      business_ratio: 100,
    }));
  }

  function changeAccount(code: string) {
    setForm((f) => ({ ...f, account_code: code, tax_rate: account(code).taxRate ?? f.tax_rate }));
  }

  // 過去の同じ取引先の科目を提案
  const partnerSuggestions = useMemo(() => {
    const names = new Set<string>();
    partners.forEach((p) => names.add(p.name));
    transactions.forEach((t) => t.partner_name && names.add(t.partner_name));
    return [...names].slice(0, 300);
  }, [partners, transactions]);

  function onPartnerChange(name: string) {
    const p = partners.find((x) => x.name === name);
    setForm((f) => {
      const next = { ...f, partner_name: name, partner_id: p?.id ?? null };
      if (!tx && name) {
        const last = [...transactions].reverse().find((t) => t.partner_name === name && t.kind === f.kind);
        if (last) {
          next.account_code = last.account_code;
          next.tax_rate = last.tax_rate;
          next.wallet = last.wallet;
          next.business_ratio = last.business_ratio;
        }
      }
      return next;
    });
  }

  function applyAi(r: AiResult, source: "receipt" | "text") {
    setForm((f) => {
      const kind = r.kind && ["income", "expense", "transfer"].includes(r.kind) ? r.kind : f.kind;
      const validCodes = (kind === "income" ? REVENUE_ACCOUNTS : EXPENSE_ACCOUNTS).map((a) => a.code);
      const code = r.account_code && validCodes.includes(r.account_code) ? r.account_code : f.account_code;
      const next: TransactionInput = {
        ...f,
        kind: kind === "transfer" ? f.kind : kind,
        date: r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : f.date,
        account_code: code,
        tax_rate: ([0, 8, 10].includes(Number(r.tax_rate)) ? Number(r.tax_rate) : f.tax_rate) as TaxRate,
        partner_name: r.partner_name ?? f.partner_name,
        memo: r.memo ?? f.memo,
        wallet: r.wallet && WALLETS.some((w) => w.id === r.wallet) ? r.wallet : f.wallet,
      };
      const p = partners.find((x) => x.name === next.partner_name);
      next.partner_id = p?.id ?? null;
      return next;
    });
    if (r.amount && r.amount > 0) setAmountText(String(Math.round(r.amount)));
    const parts = [
      source === "receipt" ? "領収書を読み取りました" : "内容を読み取りました",
      r.invoice_number ? `登録番号 ${r.invoice_number}` : null,
      "内容を確認してから保存してください",
    ].filter(Boolean);
    setAiNote(parts.join("・"));
  }

  async function onReceipt(file: File | undefined) {
    if (!file) return;
    setAiBusy("receipt");
    setAiNote(null);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const blob = isPdf ? file : await compressImage(file, 2000, 0.85);
      const path = await uploadReceipt(session.user.id, blob);
      const prev = uploadedRef.current;
      if (prev && prev !== tx?.receipt_path) void removeReceipt(prev).catch(() => {});
      uploadedRef.current = path;
      set("receipt_path", path);
      const { entries } = await callApi<{ entries: ReceiptEntry[] }>("/api/ai/receipt", { path, today: today() });
      applyAi(entries[0], "receipt");
      if (entries.length > 1) {
        setAiNote(
          `${entries.length} 件の領収書が写っています。1 件目を入れました。まとめて登録するときは取引画面の「領収書から自動で経費を登録」を使ってください`,
        );
      }
    } catch (e) {
      setAiNote(`読み取りに失敗しました: ${e instanceof Error ? e.message : e}（手入力で続けられます）`);
    } finally {
      setAiBusy(null);
    }
  }

  async function onAiText() {
    if (!aiText.trim()) return;
    voice.stop();
    setAiBusy("text");
    setAiNote(null);
    try {
      const r = await callApi<AiResult>("/api/ai/parse-entry", { text: aiText, today: today() });
      if (r.kind && r.kind !== form.kind && r.kind !== "transfer") changeKind(r.kind);
      applyAi(r, "text");
    } catch (e) {
      setAiNote(`読み取りに失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setAiBusy(null);
    }
  }

  const amount = parseAmount(amountText);
  const canSave = amount > 0 && form.date && form.account_code && !busy;

  async function save(addAnother = false) {
    if (!canSave) return;
    setBusy(true);
    try {
      const receipt_path = form.receipt_path;
      const data: TransactionInput = {
        ...form,
        amount,
        receipt_path,
        paid_date: form.status === "paid" ? form.paid_date : null,
        from_code: form.kind === "transfer" ? form.from_code : null,
        tax_rate: form.kind === "transfer" ? 0 : form.tax_rate,
        business_ratio: form.kind === "expense" ? form.business_ratio : 100,
      };
      if (tx) {
        await updateTransaction(tx.id, data);
        if (tx.receipt_path && tx.receipt_path !== receipt_path) await removeReceipt(tx.receipt_path).catch(() => {});
      } else {
        await addTransaction(data);
      }
      uploadedRef.current = null; // 保存したので消さない
      if (addAnother) {
        setForm((f) => ({ ...blank(f.kind), date: f.date, wallet: f.wallet }));
        setAmountText("");
        setAiText("");
        setAiNote("保存しました。続けて入力できます");
      } else {
        onClose();
      }
    } catch (e) {
      alert(`保存できませんでした: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!tx || !confirm("この取引を削除しますか？（元に戻せません）")) return;
    setBusy(true);
    try {
      await deleteTransaction(tx.id);
      onClose();
    } catch (e) {
      alert(`削除できませんでした: ${e instanceof Error ? e.message : e}`);
      setBusy(false);
    }
  }

  const accounts =
    form.kind === "income" ? REVENUE_ACCOUNTS : form.kind === "expense" ? EXPENSE_ACCOUNTS : TRANSFER_ACCOUNTS;
  const businessAmount = Math.floor((amount * form.business_ratio) / 100);

  return (
    <Modal
      open
      onClose={cancel}
      title={tx ? "取引を編集" : "取引を登録"}
      footer={
        <>
          {tx && (
            <Button variant="ghost" className="mr-auto text-red-700" onClick={remove} disabled={busy}>
              <Trash2 size={16} /> 削除
            </Button>
          )}
          {!tx && (
            <Button variant="secondary" onClick={() => save(true)} disabled={!canSave}>
              保存して続ける
            </Button>
          )}
          <Button onClick={() => save(false)} disabled={!canSave}>
            {busy ? <Spinner /> : "保存"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Segmented value={form.kind} onChange={changeKind} options={KIND_OPTIONS} className="w-full" />

        {/* AI 入力 */}
        {form.kind !== "transfer" && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => cameraRef.current?.click()}
                disabled={aiBusy !== null}
              >
                {aiBusy === "receipt" ? <Spinner /> : <Camera size={15} />} 領収書を撮影
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => fileRef.current?.click()}
                disabled={aiBusy !== null}
              >
                <ImageIcon size={15} /> 画像・PDF
              </Button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  void onReceipt(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                hidden
                onChange={(e) => {
                  void onReceipt(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void onAiText();
                    }
                  }}
                  placeholder="例: 昨日コーナンで防蟻剤 8,800円 カード"
                  className="pr-10"
                />
                {voice.supported && (
                  <button
                    type="button"
                    onClick={() => (voice.listening ? voice.stop() : voice.start())}
                    className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 ${
                      voice.listening ? "animate-pulse bg-red-600 text-white" : "text-slate-500 hover:bg-slate-200"
                    }`}
                    aria-label="音声入力"
                  >
                    {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
              <Button size="md" onClick={onAiText} disabled={!aiText.trim() || aiBusy !== null}>
                {aiBusy === "text" ? <Spinner /> : <Sparkles size={15} />}
                <span className="hidden sm:inline">AI入力</span>
              </Button>
            </div>
            {aiNote && <p className="mt-2 text-xs text-slate-600">{aiNote}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="日付">
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="金額（税込）">
            <Input
              inputMode="numeric"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="0"
              className="text-right tabular-nums"
            />
          </Field>
        </div>

        {form.kind === "transfer" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="出どころ（貸方）">
              <Select value={form.from_code ?? ""} onChange={(e) => set("from_code", e.target.value)}>
                {TRANSFER_ACCOUNTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="行き先（借方）">
              <Select value={form.account_code} onChange={(e) => set("account_code", e.target.value)}>
                {TRANSFER_ACCOUNTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="col-span-2 text-[11px] leading-relaxed text-slate-500">
              例: ATM で引き出し＝普通預金→現金 / 生活費に回した＝普通預金→事業主貸 / カード代金の引落し＝普通預金→未払金 /
              個人のお金を入れた＝事業主借→普通預金
            </p>
          </div>
        ) : (
          <>
            <Field label="勘定科目" hint={account(form.account_code).hint}>
              <Select value={form.account_code} onChange={(e) => changeAccount(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={form.kind === "income" ? "入金先" : "支払方法"}>
                <Select value={form.wallet} onChange={(e) => set("wallet", e.target.value as Wallet)}>
                  {WALLETS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="消費税">
                <Select value={form.tax_rate} onChange={(e) => set("tax_rate", Number(e.target.value) as TaxRate)}>
                  <option value={10}>10%</option>
                  <option value={8}>8%（軽減）</option>
                  <option value={0}>対象外・非課税</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={form.kind === "income" ? "入金状況" : "支払状況"}>
                <Select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as TransactionInput["status"])}
                >
                  <option value="paid">{form.kind === "income" ? "入金済み" : "支払済み"}</option>
                  <option value="unpaid">{form.kind === "income" ? "未入金（売掛）" : "未払い"}</option>
                </Select>
              </Field>
              {form.status === "paid" && (
                <Field label={form.kind === "income" ? "入金日（後日の場合）" : "支払日（後日の場合）"}>
                  <Input
                    type="date"
                    value={form.paid_date ?? ""}
                    onChange={(e) => set("paid_date", e.target.value || null)}
                  />
                </Field>
              )}
            </div>
            {form.kind === "expense" && (
              <Field
                label={`事業で使った割合: ${form.business_ratio}%`}
                hint={
                  form.business_ratio < 100
                    ? `経費 ${yen(businessAmount)} / 家事分（事業主貸） ${yen(amount - businessAmount)}`
                    : "自宅兼事務所の家賃・電気代、私用もある車やスマホは割合を下げる（家事按分）"
                }
              >
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={form.business_ratio}
                  onChange={(e) => set("business_ratio", Number(e.target.value))}
                  className="w-full accent-[#1e3a5f]"
                />
              </Field>
            )}
          </>
        )}

        <Field label="取引先">
          <Input
            list="partner-list"
            value={form.partner_name}
            onChange={(e) => onPartnerChange(e.target.value)}
            placeholder={form.kind === "income" ? "お客様名" : "お店・支払先"}
          />
          <datalist id="partner-list">
            {partnerSuggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <Field label="メモ（品名・現場名など）">
          <Textarea rows={2} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </Field>

        {form.receipt_path && (
          <div className="flex items-center gap-3">
            <ReceiptThumb path={form.receipt_path} className="h-24 w-20" />
            <div className="text-xs text-slate-500">
              <p>この取引の領収書（タップで拡大）</p>
              <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => set("receipt_path", null)}>
                領収書を外す
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
