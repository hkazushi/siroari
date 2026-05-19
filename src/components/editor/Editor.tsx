"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { nanoid } from "nanoid";
import { useEditor } from "@/lib/store";
import { Toolbar } from "./Toolbar";
import { Properties } from "./Properties";
import { StampLibrary } from "./StampLibrary";
import { VisitInfoBar } from "./VisitInfoBar";
import { QuickStamps } from "./QuickStamps";
import { CompassOverlay, ScaleBarOverlay } from "./CanvasOverlays";
import {
  ChemicalsDialog,
  TemplatesDialog,
  SignatureDialog,
  VisitMetaDialog,
  StampPhotoDialog,
} from "./Dialogs";
import { HeatmapDialog } from "./HeatmapDialog";
import { AIFloorPlanDialog } from "./AIFloorPlanDialog";
import { saveVisit, loadVisit, listVisits, deleteVisit } from "@/lib/db";
import { cloudSaveVisit } from "@/lib/sync";
import { BUILDING_TEMPLATES } from "@/lib/templates";
import { Logo } from "@/components/Logo";
import { Home as HomeIcon, Users, Check } from "lucide-react";
import type { CanvasHandle } from "./Canvas";
import type { Visit } from "@/types";

const Canvas = dynamic(() => import("./Canvas").then((m) => m.Canvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-400">
      読み込み中...
    </div>
  ),
});

type DialogKind =
  | null
  | "chemicals"
  | "templates"
  | "customerSign"
  | "technicianSign"
  | "visitMeta"
  | "heatmap"
  | "stampPhoto"
  | "openVisit"
  | "ai";

export function Editor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleRef = useRef<CanvasHandle | null>(null);
  // モバイルではサイドバーを閉じてスタート（キャンバスをフル表示）
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [photoStampId, setPhotoStampId] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [aiMode, setAiMode] = useState<"text" | "photo" | "canvas">("text");
  const [aiCanvasSnap, setAiCanvasSnap] = useState<string | null>(null);

  // 起動時にビューポート幅でデフォルト状態を決定（デスクトップは両側パネル開く）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.innerWidth >= 640;
    queueMicrotask(() => {
      if (isDesktop) {
        setSidebarOpen(true);
        setPropsOpen(true);
      }
    });
  }, []);

  // ?new=1 が付いてきたら新規マップとして初期化する
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      useEditor.getState().newProject();
      // URL をクリーンに保つため new=1 を消す
      router.replace("/editor");
    }
  }, [searchParams, router]);

  const {
    selectedIds,
    updateElement,
    projectId,
    loadProject: loadInStore,
    serialize,
    paperSize,
    setScale,
    setOffset,
    stageSize,
    elements,
    applyTemplate,
  } = useEditor();

  const onSave = useCallback(async () => {
    const p = serialize();
    if (!projectId) {
      const id = nanoid(10);
      p.id = id;
      useEditor.setState({ projectId: id });
    }
    await saveVisit(p);
    // 同時にクラウドにも保存（クラウド未設定なら no-op）
    await cloudSaveVisit(p);
    alert("保存しました");
  }, [projectId, serialize]);

  const onSaveAndExit = useCallback(async () => {
    const p = serialize();
    if (!projectId) {
      const id = nanoid(10);
      p.id = id;
      useEditor.setState({ projectId: id });
    }
    await saveVisit(p);
    await cloudSaveVisit(p);
    router.push("/");
  }, [projectId, router, serialize]);

  const onReport = useCallback(async () => {
    // Save first so /report can load it
    const p = serialize();
    if (!projectId) {
      const id = nanoid(10);
      p.id = id;
      useEditor.setState({ projectId: id });
    }
    await saveVisit(p);
    // Capture map snapshot and stash in sessionStorage
    const data = handleRef.current?.exportPNG();
    if (data && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`report:${p.id}:map`, data);
      } catch {
        // Storage may fail if too big; degrade gracefully
      }
    }
    router.push(`/report/${p.id}`);
  }, [projectId, router, serialize]);

  const onOpen = useCallback(async () => {
    const list = await listVisits();
    setVisits(list);
    setDialog("openVisit");
  }, []);

  const onRotate = useCallback(() => {
    for (const id of selectedIds) {
      const el = useEditor.getState().elements.find((e) => e.id === id);
      if (!el) continue;
      if (el.type === "stamp" || el.type === "text") {
        updateElement(id, { rotation: (el.rotation + 90) % 360 } as Partial<
          typeof el
        >);
      }
    }
  }, [selectedIds, updateElement]);

  const onFitView = useCallback(() => {
    if (!stageSize.width || !stageSize.height) return;
    const margin = 80;
    const sx = (stageSize.width - margin * 2) / paperSize.width;
    const sy = (stageSize.height - margin * 2) / paperSize.height;
    const s = Math.min(sx, sy);
    setScale(s);
    setOffset({
      x: (stageSize.width - paperSize.width * s) / 2,
      y: (stageSize.height - paperSize.height * s) / 2,
    });
  }, [stageSize.width, stageSize.height, paperSize.width, paperSize.height, setScale, setOffset]);

  void BUILDING_TEMPLATES; // (TemplatesDialog handles built-ins internally)

  // Expose store on window for testing/debug
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __editor: typeof useEditor }).__editor = useEditor;
    }
  }, []);

  // Hotkeys
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const map: Record<string, string> = {
        v: "select",
        h: "pan",
        w: "wall",
        r: "room",
        s: "stamp",
        t: "text",
        d: "dimension",
        e: "eraser",
        k: "sketch",
      };
      const tool = map[ev.key.toLowerCase()];
      if (tool) useEditor.getState().setTool(tool as never);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Properties panel passes photo open requests
  useEffect(() => {
    const opener = (id: string) => {
      setPhotoStampId(id);
      setDialog("stampPhoto");
    };
    (window as unknown as { __openStampPhoto?: (id: string) => void }).__openStampPhoto = opener;
    return () => {
      delete (window as unknown as { __openStampPhoto?: (id: string) => void }).__openStampPhoto;
    };
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col bg-slate-50">
      {/* Brand header */}
      <div className="flex items-center gap-2 border-b-2 border-[#991b1b] bg-white px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-slate-100"
          title="ホームへ戻る"
        >
          <Logo size={32} withText={false} />
          <div className="hidden leading-tight sm:block">
            <div className="text-[13px] font-bold text-[#1e3a5f]">
              東山メンテナンス
            </div>
            <div className="text-[10px] text-slate-500">
              害虫駆除 / 現場マップ
            </div>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="ホームへ"
          >
            <HomeIcon size={14} />
            <span className="hidden sm:inline">ホーム</span>
          </Link>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="顧客台帳"
          >
            <Users size={14} />
            <span className="hidden sm:inline">顧客</span>
          </Link>
          <button
            onClick={onSaveAndExit}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 sm:px-3"
            title="保存してホームへ"
          >
            <Check size={14} />
            <span className="hidden sm:inline">保存して戻る</span>
            <span className="sm:hidden">保存</span>
          </button>
        </div>
      </div>

      {/* Visit context bar */}
      <VisitInfoBar onEdit={() => setDialog("visitMeta")} />

      <Toolbar
        onSave={onSave}
        onReport={onReport}
        onOpen={onOpen}
        onRotate={onRotate}
        onFitView={onFitView}
        onChemicals={() => setDialog("chemicals")}
        onTemplates={() => setDialog("templates")}
        onCustomerSign={() => setDialog("customerSign")}
        onTechnicianSign={() => setDialog("technicianSign")}
        onVisitMeta={() => setDialog("visitMeta")}
        onHeatmap={() => setDialog("heatmap")}
        onAI={() => {
          setAiMode("text");
          setAiCanvasSnap(null);
          setDialog("ai");
        }}
      />

      <div className="flex min-h-0 flex-1">
        <div className={`hidden shrink-0 sm:block ${sidebarOpen ? "w-48" : "w-0"}`}>
          <StampLibrary />
        </div>
        <div className="relative flex-1">
          <Canvas onReady={(h) => (handleRef.current = h)} />

          {/* Overlays */}
          <CompassOverlay />
          <ScaleBarOverlay />
          <QuickStamps />

          {/* 手描きがある時の「AI で整形」フローティングボタン */}
          {elements.some((e) => e.type === "sketch") && (
            <button
              onClick={() => {
                const snap = handleRef.current?.exportPNG();
                if (snap) {
                  setAiCanvasSnap(snap);
                  setAiMode("canvas");
                  setDialog("ai");
                }
              }}
              className="absolute right-3 bottom-16 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-rose-600"
              title="手描きの内容を AI が解析して整った間取りに整形します"
            >
              ✨ 手描きを AI で整形
            </button>
          )}

          {/* Mobile sidebar toggles */}
          <button
            className="absolute left-2 top-2 rounded bg-white px-2 py-1 text-xs shadow hover:bg-slate-50 sm:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            スタンプ
          </button>
          <button
            className="absolute right-2 top-2 rounded bg-white px-2 py-1 text-xs shadow hover:bg-slate-50 sm:hidden"
            onClick={() => setPropsOpen((v) => !v)}
          >
            プロパティ
          </button>

          {/* Mobile overlays */}
          {sidebarOpen && (
            <div className="absolute left-0 top-10 z-20 h-[calc(100%-2.5rem)] w-48 sm:hidden">
              <StampLibrary />
            </div>
          )}
          {propsOpen && (
            <div className="absolute right-0 top-10 z-20 h-[calc(100%-2.5rem)] w-64 sm:hidden">
              <Properties />
            </div>
          )}
        </div>
        <div className={`hidden shrink-0 sm:block ${propsOpen ? "" : "hidden"}`}>
          <Properties />
        </div>
      </div>

      {/* Empty-state hint（モバイルでサイドバーと重ならない位置） */}
      {elements.length === 0 && !sidebarOpen && !propsOpen && (
        <div className="pointer-events-auto absolute left-1/2 bottom-20 z-10 flex -translate-x-1/2 flex-col gap-2 sm:bottom-auto sm:top-4">
          <button
            onClick={() => setDialog("ai")}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:from-amber-600 hover:to-rose-600"
          >
            ✨ AI に音声で間取りを描かせる
          </button>
          <button
            onClick={() => setDialog("templates")}
            className="rounded-full border-2 border-dashed border-slate-300 bg-white px-4 py-1.5 text-xs text-slate-600 hover:border-[#991b1b] hover:bg-red-50"
          >
            🏠 テンプレートから始める / 自由描画
          </button>
        </div>
      )}

      {/* Dialogs */}
      {dialog === "openVisit" && (
        <OpenVisitDialog
          visits={visits}
          onClose={() => setDialog(null)}
          onPick={async (id) => {
            const p = await loadVisit(id);
            if (p) {
              loadInStore(p);
              setDialog(null);
            }
          }}
          onNew={() => {
            useEditor.getState().newProject();
            setDialog(null);
          }}
          onDelete={async (id) => {
            await deleteVisit(id);
            const list = await listVisits();
            setVisits(list);
          }}
        />
      )}
      {dialog === "chemicals" && (
        <ChemicalsDialog onClose={() => setDialog(null)} />
      )}
      {dialog === "templates" && (
        <TemplatesDialog
          onClose={() => setDialog(null)}
          onApply={(els) => applyTemplate(els)}
        />
      )}
      {dialog === "customerSign" && (
        <SignatureDialog who="customer" onClose={() => setDialog(null)} />
      )}
      {dialog === "technicianSign" && (
        <SignatureDialog who="technician" onClose={() => setDialog(null)} />
      )}
      {dialog === "visitMeta" && (
        <VisitMetaDialog onClose={() => setDialog(null)} />
      )}
      {dialog === "heatmap" && (
        <HeatmapDialog onClose={() => setDialog(null)} />
      )}
      {dialog === "ai" && (
        <AIFloorPlanDialog
          onClose={() => setDialog(null)}
          initialMode={aiMode}
          canvasSnapshot={aiCanvasSnap}
        />
      )}
      {dialog === "stampPhoto" && photoStampId && (
        <StampPhotoDialog
          stampId={photoStampId}
          onClose={() => {
            setDialog(null);
            setPhotoStampId(null);
          }}
        />
      )}
    </div>
  );
}

function OpenVisitDialog({
  visits,
  onClose,
  onPick,
  onNew,
  onDelete,
}: {
  visits: Visit[];
  onClose: () => void;
  onPick: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="font-semibold">施工マップを開く</div>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          <button
            className="mb-2 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-[#991b1b] hover:bg-red-50"
            onClick={onNew}
          >
            + 新規マップ
          </button>
          {visits.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">
              保存された記録はありません
            </div>
          )}
          {visits.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 rounded px-2 py-2 hover:bg-slate-50"
            >
              <button
                className="flex-1 text-left text-sm"
                onClick={() => onPick(v.id)}
              >
                <div className="font-medium text-slate-800">{v.name}</div>
                <div className="text-xs text-slate-400">
                  {new Date(v.updatedAt).toLocaleString("ja-JP")} ・{" "}
                  {v.elements.length} 要素
                </div>
              </button>
              <button
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`「${v.name}」を削除しますか？`)) onDelete(v.id);
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
