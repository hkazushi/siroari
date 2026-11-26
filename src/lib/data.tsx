"use client";

// Supabase のデータを全件読み込んでメモリに持つ（個人事業の取引量なら十分軽い）。
// 書き込みは Supabase に保存 → 成功したら state を更新。

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  DEFAULT_PROFILE,
  type BusinessProfile,
  type FixedAsset,
  type FixedAssetInput,
  type Invoice,
  type InvoiceInput,
  type Partner,
  type PartnerInput,
  type Transaction,
  type TransactionInput,
} from "./types";

type Table = "transactions" | "partners" | "invoices" | "fixed_assets";

async function fetchAll<T>(table: Table, order: string): Promise<T[]> {
  const out: T[] = [];
  const page = 1000; // Supabase は 1 リクエスト最大 1000 行
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase()
      .from(table)
      .select("*")
      .order(order, { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) break;
  }
  return out;
}

function normalizeTx(r: Transaction): Transaction {
  return { ...r, amount: Number(r.amount), tax_rate: Number(r.tax_rate) as Transaction["tax_rate"] };
}
function normalizeAsset(r: FixedAsset): FixedAsset {
  return { ...r, cost: Number(r.cost) };
}

function sortTx(list: Transaction[]) {
  return [...list].sort((a, b) =>
    a.date === b.date ? (a.created_at ?? "").localeCompare(b.created_at ?? "") : a.date < b.date ? -1 : 1,
  );
}

interface DataCtx {
  session: Session;
  loading: boolean;
  error: string | null;
  profile: BusinessProfile;
  transactions: Transaction[];
  partners: Partner[];
  invoices: Invoice[];
  assets: FixedAsset[];
  reload: () => Promise<void>;
  saveProfile: (p: BusinessProfile) => Promise<void>;
  addTransaction: (t: TransactionInput) => Promise<Transaction>;
  updateTransaction: (id: string, t: Partial<TransactionInput>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addPartner: (p: PartnerInput) => Promise<Partner>;
  updatePartner: (id: string, p: Partial<PartnerInput>) => Promise<Partner>;
  deletePartner: (id: string) => Promise<void>;
  addInvoice: (i: InvoiceInput) => Promise<Invoice>;
  updateInvoice: (id: string, i: Partial<InvoiceInput>) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;
  addAsset: (a: FixedAssetInput) => Promise<FixedAsset>;
  updateAsset: (id: string, a: Partial<FixedAssetInput>) => Promise<FixedAsset>;
  deleteAsset: (id: string) => Promise<void>;
  /** /api/ai/* を認証付きで呼ぶ */
  callApi: <T>(path: string, body: unknown) => Promise<T>;
}

const Ctx = createContext<DataCtx | null>(null);

export function useData(): DataCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("DataProvider がありません");
  return v;
}

export function DataProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [prof, txs, ps, invs, fas] = await Promise.all([
        supabase().from("business_profile").select("*").maybeSingle(),
        fetchAll<Transaction>("transactions", "date"),
        fetchAll<Partner>("partners", "created_at"),
        fetchAll<Invoice>("invoices", "issue_date"),
        fetchAll<FixedAsset>("fixed_assets", "acquired_date"),
      ]);
      if (prof.error) throw new Error(`business_profile: ${prof.error.message}`);
      setProfile({ ...DEFAULT_PROFILE, ...(prof.data ?? {}) });
      setTransactions(sortTx(txs.map(normalizeTx)));
      setPartners(ps);
      setInvoices(invs);
      setAssets(fas.map(normalizeAsset));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void reload());
  }, [reload]);

  const value = useMemo<DataCtx>(() => {
    async function insert<T>(table: Table, row: object): Promise<T> {
      const { data, error } = await supabase().from(table).insert(row).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    }
    async function update<T>(table: Table, id: string, patch: object): Promise<T> {
      const { data, error } = await supabase().from(table).update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    }
    async function remove(table: Table, id: string) {
      const { error } = await supabase().from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    }

    return {
      session,
      loading,
      error,
      profile,
      transactions,
      partners,
      invoices,
      assets,
      reload,
      async saveProfile(p) {
        const { opening_balances, ...rest } = p;
        const { data, error } = await supabase()
          .from("business_profile")
          .upsert({ user_id: session.user.id, ...rest, opening_balances })
          .select()
          .single();
        if (error) throw new Error(error.message);
        setProfile({ ...DEFAULT_PROFILE, ...data });
      },
      async addTransaction(t) {
        const row = normalizeTx(await insert<Transaction>("transactions", t));
        setTransactions((l) => sortTx([...l, row]));
        return row;
      },
      async updateTransaction(id, t) {
        const row = normalizeTx(await update<Transaction>("transactions", id, t));
        setTransactions((l) => sortTx(l.map((x) => (x.id === id ? row : x))));
        return row;
      },
      async deleteTransaction(id) {
        const tx = transactions.find((t) => t.id === id);
        await remove("transactions", id);
        if (tx?.receipt_path) await supabase().storage.from("receipts").remove([tx.receipt_path]);
        setTransactions((l) => l.filter((x) => x.id !== id));
      },
      async addPartner(p) {
        const row = await insert<Partner>("partners", p);
        setPartners((l) => [...l, row]);
        return row;
      },
      async updatePartner(id, p) {
        const row = await update<Partner>("partners", id, p);
        setPartners((l) => l.map((x) => (x.id === id ? row : x)));
        return row;
      },
      async deletePartner(id) {
        await remove("partners", id);
        setPartners((l) => l.filter((x) => x.id !== id));
      },
      async addInvoice(i) {
        const row = await insert<Invoice>("invoices", i);
        setInvoices((l) => [...l, row]);
        return row;
      },
      async updateInvoice(id, i) {
        const row = await update<Invoice>("invoices", id, i);
        setInvoices((l) => l.map((x) => (x.id === id ? row : x)));
        return row;
      },
      async deleteInvoice(id) {
        await remove("invoices", id);
        setInvoices((l) => l.filter((x) => x.id !== id));
        // 紐づく売上取引の invoice_id は DB 側で null になる
        setTransactions((l) => l.map((t) => (t.invoice_id === id ? { ...t, invoice_id: null } : t)));
      },
      async addAsset(a) {
        const row = normalizeAsset(await insert<FixedAsset>("fixed_assets", a));
        setAssets((l) => [...l, row]);
        return row;
      },
      async updateAsset(id, a) {
        const row = normalizeAsset(await update<FixedAsset>("fixed_assets", id, a));
        setAssets((l) => l.map((x) => (x.id === id ? row : x)));
        return row;
      },
      async deleteAsset(id) {
        await remove("fixed_assets", id);
        setAssets((l) => l.filter((x) => x.id !== id));
      },
      async callApi<T>(path: string, body: unknown): Promise<T> {
        const { data } = await supabase().auth.getSession();
        const token = data.session?.access_token ?? session.access_token;
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? `エラー (${res.status})`);
        return json as T;
      },
    };
  }, [session, loading, error, profile, transactions, partners, invoices, assets, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 領収書画像を Storage に保存してパスを返す */
export async function uploadReceipt(userId: string, blob: Blob): Promise<string> {
  const ext = blob.type === "image/png" ? "png" : blob.type === "application/pdf" ? "pdf" : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase().storage.from("receipts").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`領収書の保存に失敗: ${error.message}`);
  return path;
}

export async function receiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from("receipts").createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeReceipt(path: string): Promise<void> {
  await supabase().storage.from("receipts").remove([path]);
}
