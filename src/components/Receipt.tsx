"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ExternalLink, FileText, Paperclip, Upload, X } from "lucide-react";
import { accountName } from "@/lib/accounts";
import { receiptUrl, uploadReceipt, useData } from "@/lib/data";
import { shortDate, today, yen } from "@/lib/format";
import { compressImage } from "@/lib/image";
import type { ReceiptEntry, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTxDialog } from "./TransactionDialog";
import { Button, Card, Modal, Spinner } from "./ui";

export const isPdfPath = (path: string) => path.toLowerCase().endsWith(".pdf");

// 署名付き URL を少しの間使い回す（一覧で同じ領収書を何度も署名しないように）
const urlCache = new Map<string, { url: string; exp: number }>();
async function signedUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const url = await receiptUrl(path);
  urlCache.set(path, { url, exp: Date.now() + 8 * 60 * 1000 });
  return url;
}

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    signedUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [path]);
  return path ? url : null;
}

/** 領収書を大きく表示（画像 or PDF） */
export function ReceiptViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const url = useSignedUrl(path);
  const pdf = isPdfPath(path);
  return (
    <Modal open onClose={onClose} title="領収書" wide>
      {!url ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Spinner />
        </div>
      ) : pdf ? (
        <div className="space-y-2">
          <iframe src={url} title="領収書 PDF" className="h-[70dvh] w-full rounded-lg border" />
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-[#1e3a5f] underline">
            <ExternalLink size={14} /> 新しいタブで開く
          </a>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="領収書" className="mx-auto max-h-[75dvh] w-auto rounded-lg" />
      )}
    </Modal>
  );
}

/** 小さなサムネイル。タップで拡大表示 */
export function ReceiptThumb({ path, className }: { path: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const pdf = isPdfPath(path);
  const url = useSignedUrl(pdf ? null : path);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:border-[#1e3a5f]",
          className ?? "h-10 w-10",
        )}
        title="領収書を見る"
        aria-label="領収書を見る"
      >
        {pdf ? (
          <span className="flex flex-col items-center text-[9px] font-bold text-red-700">
            <FileText size={16} />
            PDF
          </span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Paperclip size={14} />
        )}
      </button>
      {open && <ReceiptViewer path={path} onClose={() => setOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------
// まとめて取り込み: ファイルを入れると AI が読み取り、経費を自動で作る
// ---------------------------------------------------------------------

type Job = {
  id: string;
  name: string;
  status: "upload" | "read" | "done" | "error";
  path?: string;
  created: Transaction[];
  duplicates: number;
  error?: string;
};

const ACCEPT = "image/*,application/pdf";

/** 画像なら縮小、PDF はそのまま。それ以外はエラー */
async function prepare(file: File): Promise<Blob> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return file.type ? file : new Blob([file], { type: "application/pdf" });
  }
  if (file.type.startsWith("image/")) return compressImage(file, 2000, 0.85);
  throw new Error("画像か PDF を選んでください");
}

export function ReceiptImporter({ className }: { className?: string }) {
  const { session, transactions, partners, addTransaction, callApi } = useData();
  const { openEdit, openNew } = useTxDialog();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // 非同期処理の途中でも最新の取引一覧を見られるように
  const txRef = useRef(transactions);
  useEffect(() => {
    txRef.current = transactions;
  }, [transactions]);

  const patch = (id: string, p: Partial<Job>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));

  async function runOne(job: Job, file: File) {
    try {
      const blob = await prepare(file);
      const path = await uploadReceipt(session.user.id, blob);
      patch(job.id, { status: "read", path });
      const { entries } = await callApi<{ entries: ReceiptEntry[] }>("/api/ai/receipt", { path, today: today() });
      const created: Transaction[] = [];
      let duplicates = 0;
      for (const e of entries) {
        if (txRef.current.some((t) => t.date === e.date && t.amount === e.amount && t.kind === e.kind)) duplicates++;
        const partner = partners.find((p) => p.name === e.partner_name);
        created.push(
          await addTransaction({
            kind: e.kind,
            date: e.date,
            amount: e.amount,
            account_code: e.account_code,
            from_code: null,
            wallet: e.wallet,
            status: "paid",
            paid_date: null,
            tax_rate: e.tax_rate,
            partner_id: partner?.id ?? null,
            partner_name: e.partner_name,
            memo: [e.memo, e.invoice_number && `登録番号 ${e.invoice_number}`].filter(Boolean).join(" ／ "),
            receipt_path: path,
            invoice_id: null,
            business_ratio: 100,
          }),
        );
      }
      patch(job.id, { status: "done", created, duplicates });
    } catch (e) {
      patch(job.id, { status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const newJobs: Job[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name || "写真",
      status: "upload",
      created: [],
      duplicates: 0,
    }));
    setJobs((js) => [...newJobs, ...js]);
    // 2 件ずつ並行して処理
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        await runOne(newJobs[i], files[i]);
      }
    };
    await Promise.all([worker(), worker()]);
  }

  const busy = jobs.some((j) => j.status === "upload" || j.status === "read");
  const createdCount = jobs.reduce((s, j) => s + j.created.length, 0);

  return (
    <Card className={cn("p-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
          drag ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-slate-300",
        )}
      >
        <div className="text-sm font-bold text-slate-800">領収書・レシートから自動で経費を登録</div>
        <p className="text-xs text-slate-500">
          画像や PDF を入れると、AI が日付・金額・お店・科目を読み取って経費を作ります（複数まとめて OK）
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => cameraRef.current?.click()} className="sm:hidden">
            <Camera size={15} /> 撮影する
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> ファイルを選ぶ
          </Button>
        </div>
        <p className="hidden text-[11px] text-slate-400 sm:block">ここにファイルをドラッグ＆ドロップしても登録できます</p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {jobs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              {busy ? "読み取り中…" : `${createdCount} 件の取引を作成しました。違っていたらタップして直してください`}
            </span>
            {!busy && (
              <button className="hover:text-slate-800" onClick={() => setJobs([])}>
                閉じる
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {jobs.map((j) => (
              <li key={j.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  {j.status === "done" ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  ) : j.status === "error" ? (
                    <AlertTriangle size={16} className="shrink-0 text-red-600" />
                  ) : (
                    <Spinner className="shrink-0 text-slate-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                    {j.name}
                    {j.status === "upload" && " … 保存中"}
                    {j.status === "read" && " … 読み取り中"}
                  </span>
                  {j.path && <ReceiptThumb path={j.path} className="h-8 w-8" />}
                </div>
                {j.created.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openEdit(t)}
                    className="mt-1 flex w-full items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-left hover:bg-slate-100"
                  >
                    <span className="w-10 text-xs text-slate-500 tabular-nums">{shortDate(t.date)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {t.partner_name || t.memo || accountName(t.account_code)}
                      <span className="ml-1.5 text-[11px] text-slate-500">{accountName(t.account_code)}</span>
                    </span>
                    <span className="font-medium tabular-nums">{yen(t.amount)}</span>
                  </button>
                ))}
                {j.duplicates > 0 && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    同じ日付・金額の取引がすでにあります。二重登録でないか確認してください
                  </p>
                )}
                {j.status === "error" && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-red-700">
                    <span>{j.error}</span>
                    {j.path && (
                      <button
                        className="text-[#1e3a5f] underline"
                        onClick={() => openNew({ kind: "expense", receipt_path: j.path })}
                      >
                        手入力で登録
                      </button>
                    )}
                    {!j.path && (
                      <X size={12} className="cursor-pointer" onClick={() => setJobs((js) => js.filter((x) => x.id !== j.id))} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
