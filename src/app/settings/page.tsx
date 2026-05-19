"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  exportAllData,
  importAllData,
  listCustomTemplates,
  listCustomChemicals,
  deleteCustomTemplate,
  deleteCustomChemical,
  type CustomTemplate,
  type CustomChemical,
} from "@/lib/db";
import { isCloudConfigured } from "@/lib/supabase";
import { syncBoth, pushAllToCloud, pullAllFromCloud } from "@/lib/sync";
import {
  ArrowLeft,
  Download,
  Upload,
  Trash2,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [chemicals, setChemicals] = useState<CustomChemical[]>([]);
  const [importing, setImporting] = useState(false);
  const [exportSize, setExportSize] = useState<string>("—");
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{
    at: number;
    msg: string;
    error?: boolean;
  } | null>(null);

  const refresh = async () => {
    const [t, c, data] = await Promise.all([
      listCustomTemplates(),
      listCustomChemicals(),
      exportAllData(),
    ]);
    setTemplates(t);
    setChemicals(c);
    const json = JSON.stringify(data);
    const kb = (new Blob([json]).size / 1024).toFixed(1);
    setExportSize(`${kb} KB`);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, c, data] = await Promise.all([
        listCustomTemplates(),
        listCustomChemicals(),
        exportAllData(),
      ]);
      if (cancelled) return;
      setTemplates(t);
      setChemicals(c);
      const json = JSON.stringify(data);
      const kb = (new Blob([json]).size / 1024).toFixed(1);
      setExportSize(`${kb} KB`);
      setCloudConfigured(isCloudConfigured());
      try {
        const ls = localStorage.getItem("lastSyncAt");
        if (ls)
          setLastSync({ at: Number(ls), msg: "前回同期: 成功" });
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    a.href = url;
    a.download = `gaicyu-madori-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File, mode: "merge" | "replace") => {
    try {
      setImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importAllData(data, mode);
      alert(
        `インポート完了:\n` +
          Object.entries(result.counts)
            .map(([k, v]) => `${k}: ${v} 件`)
            .join("\n"),
      );
      await refresh();
    } catch (e) {
      alert("インポート失敗: " + (e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const doSyncBoth = async () => {
    setSyncing(true);
    try {
      const r = await syncBoth();
      const up = Object.values(r.uploaded).reduce((s, n) => s + n, 0);
      const down = Object.values(r.downloaded).reduce((s, n) => s + n, 0);
      const at = Date.now();
      localStorage.setItem("lastSyncAt", String(at));
      setLastSync({
        at,
        msg: `↑${up} 件 / ↓${down} 件 同期完了 (${r.durationMs}ms)`,
      });
      await refresh();
    } catch (e) {
      setLastSync({
        at: Date.now(),
        msg: "同期失敗: " + (e as Error).message,
        error: true,
      });
    } finally {
      setSyncing(false);
    }
  };

  const doPushOnly = async () => {
    setSyncing(true);
    try {
      const r = await pushAllToCloud();
      const up = Object.values(r).reduce((s, n) => s + n, 0);
      setLastSync({
        at: Date.now(),
        msg: `↑${up} 件 アップロード完了`,
      });
    } catch (e) {
      setLastSync({
        at: Date.now(),
        msg: "アップロード失敗: " + (e as Error).message,
        error: true,
      });
    } finally {
      setSyncing(false);
    }
  };

  const doPullOnly = async () => {
    if (
      !confirm(
        "クラウドから上書きします。ローカルにあって新しい変更が消える可能性があります。続行しますか？",
      )
    )
      return;
    setSyncing(true);
    try {
      const r = await pullAllFromCloud();
      const down = Object.values(r).reduce((s, n) => s + n, 0);
      setLastSync({
        at: Date.now(),
        msg: `↓${down} 件 ダウンロード完了`,
      });
      await refresh();
    } catch (e) {
      setLastSync({
        at: Date.now(),
        msg: "ダウンロード失敗: " + (e as Error).message,
        error: true,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="hover:opacity-80">
            <Logo size={36} withText={false} />
          </Link>
          <div className="leading-tight">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={12} /> トップへ
            </Link>
            <div className="text-[14px] font-bold text-[#1e3a5f]">設定 / バックアップ</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
        {/* Cloud Sync */}
        <section
          className={`rounded-xl p-5 shadow-sm ${
            cloudConfigured
              ? "bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-200"
              : "bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] text-white"
          }`}
        >
          <div className="flex items-start gap-3">
            {cloudConfigured ? (
              <Cloud size={28} className="shrink-0 text-emerald-600" />
            ) : (
              <CloudOff size={28} className="shrink-0" />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold">
                クラウド同期（Supabase）
                {cloudConfigured && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 size={10} /> 接続済み
                  </span>
                )}
              </h2>
              {cloudConfigured ? (
                <>
                  <p className="mt-1 text-[12px] text-slate-600">
                    複数端末の同期・端末紛失時のバックアップ・お客様向け公開リンクが利用可能です。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={doSyncBoth}
                      disabled={syncing}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={14}
                        className={syncing ? "animate-spin" : ""}
                      />
                      {syncing ? "同期中..." : "今すぐ双方向同期"}
                    </button>
                    <button
                      onClick={doPushOnly}
                      disabled={syncing}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <ArrowUpCircle size={12} /> アップロードのみ
                    </button>
                    <button
                      onClick={doPullOnly}
                      disabled={syncing}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <ArrowDownCircle size={12} /> ダウンロードのみ
                    </button>
                  </div>
                  {lastSync && (
                    <div
                      className={`mt-2 text-[11px] ${lastSync.error ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {new Date(lastSync.at).toLocaleString("ja-JP")} —{" "}
                      {lastSync.msg}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1 text-[12px] text-slate-300">
                    端末ローカル保存のみで運用中。複数端末同期にはクラウド設定が必要です。
                  </p>
                  <div className="mt-3 rounded bg-black/20 p-2 text-[11px]">
                    Supabase URL と anon key を環境変数に設定してください
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Data Backup */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-lg font-bold text-[#1e3a5f]">
            データ バックアップ
          </h2>
          <p className="text-[12px] text-slate-600">
            顧客・現場・訪問・カスタムテンプレ・薬剤プリセットをまとめて JSON
            ファイルに出力できます。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              onClick={onExport}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-3 text-sm font-bold text-white hover:bg-[#152a47]"
            >
              <Download size={16} />
              すべてエクスポート ({exportSize})
            </button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-[#1e3a5f] hover:bg-slate-50">
              <Upload size={16} />
              {importing ? "インポート中..." : "インポート（追加）"}
              <input
                type="file"
                accept="application/json,.json"
                disabled={importing}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f, "merge");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          </div>
          <div className="mt-2 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
            <AlertTriangle size={12} className="mr-1 inline" />
            「インポート」は同じ ID のデータを上書きします。
          </div>
        </section>

        {/* Custom Templates */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-lg font-bold text-[#1e3a5f]">
            自社テンプレート ({templates.length})
          </h2>
          {templates.length === 0 ? (
            <div className="rounded-md bg-slate-50 p-4 text-center text-[12px] text-slate-500">
              まだ自社テンプレがありません。エディタで「テンプレ」→「現在のマップを自社テンプレに保存」してください。
            </div>
          ) : (
            <div className="space-y-1">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-[#1e3a5f]">{t.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {t.category} / {t.elements.length} 要素 /{" "}
                      {new Date(t.updatedAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`「${t.name}」を削除しますか？`)) {
                        await deleteCustomTemplate(t.id);
                        await refresh();
                      }
                    }}
                    className="rounded p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Custom Chemicals */}
        <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-2 text-lg font-bold text-[#1e3a5f]">
            自社薬剤プリセット ({chemicals.length})
          </h2>
          {chemicals.length === 0 ? (
            <div className="rounded-md bg-slate-50 p-4 text-center text-[12px] text-slate-500">
              まだ自社プリセットがありません。エディタの「薬剤」ダイアログで「プリセットに登録」してください。
            </div>
          ) : (
            <div className="space-y-1">
              {chemicals.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-[#1e3a5f]">{c.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {c.activeIngredient && `${c.activeIngredient} / `}
                      {c.defaultDilution && `${c.defaultDilution} / `}
                      {c.unit}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`「${c.name}」を削除しますか？`)) {
                        await deleteCustomChemical(c.id);
                        await refresh();
                      }
                    }}
                    className="rounded p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
