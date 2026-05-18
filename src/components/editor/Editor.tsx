"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useEditor } from "@/lib/store";
import { Toolbar } from "./Toolbar";
import { Properties } from "./Properties";
import { StampLibrary } from "./StampLibrary";
import { saveProject, loadProject, listProjects } from "@/lib/db";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import type { CanvasHandle } from "./Canvas";
import type { FloorPlan } from "@/types";

const Canvas = dynamic(() => import("./Canvas").then((m) => m.Canvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-slate-400">
      読み込み中...
    </div>
  ),
});

export function Editor() {
  const handleRef = useRef<CanvasHandle | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propsOpen, setPropsOpen] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [projects, setProjects] = useState<FloorPlan[]>([]);

  const {
    selectedIds,
    updateElement,
    name,
    projectId,
    loadProject: loadInStore,
    serialize,
    paperSize,
    setScale,
    setOffset,
    stageSize,
  } = useEditor();

  const onSave = useCallback(async () => {
    const p = serialize();
    if (!projectId) {
      const id = nanoid(10);
      p.id = id;
      useEditor.setState({ projectId: id });
    }
    await saveProject(p);
    // toast
    alert("保存しました");
  }, [projectId, serialize]);

  const onExportPNG = useCallback(() => {
    const data = handleRef.current?.exportPNG();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = `${name}.png`;
    a.click();
  }, [name]);

  const onExportPDF = useCallback(() => {
    const data = handleRef.current?.exportPNG();
    if (!data) return;
    const stage = handleRef.current?.getStage();
    if (!stage) return;
    const w = stage.width();
    const h = stage.height();
    const orientation = w > h ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / w, pageH / h);
    const drawW = w * ratio;
    const drawH = h * ratio;
    const ox = (pageW - drawW) / 2;
    const oy = (pageH - drawH) / 2;
    pdf.addImage(data, "PNG", ox, oy, drawW, drawH);
    pdf.save(`${name}.pdf`);
  }, [name]);

  const onOpen = useCallback(async () => {
    const list = await listProjects();
    setProjects(list);
    setOpenDialog(true);
  }, []);

  const onRotate = useCallback(() => {
    for (const id of selectedIds) {
      const el = useEditor.getState().elements.find((e) => e.id === id);
      if (!el) continue;
      if (el.type === "stamp" || el.type === "text") {
        updateElement(id, { rotation: (el.rotation + 90) % 360 } as Partial<typeof el>);
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

  // Dev: expose store for debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __editor: typeof useEditor }).__editor = useEditor;
    }
  }, []);

  // Hotkeys for tools
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
      };
      const tool = map[ev.key.toLowerCase()];
      if (tool) {
        useEditor.getState().setTool(tool as never);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col bg-slate-50">
      <div className="flex items-center gap-3 border-b-2 border-[#991b1b] bg-white px-3 py-2">
        <Link href="/" className="hover:opacity-80">
          <Logo size={44} withText={false} />
        </Link>
        <div className="leading-tight">
          <div className="text-[14px] font-bold text-[#1e3a5f]">
            東山メンテナンス
          </div>
          <div className="text-[10px] text-slate-500">害虫駆除 / 現場マップ</div>
        </div>
        <div className="ml-auto hidden text-[11px] font-semibold text-[#991b1b] sm:block">
          害虫から、快適な暮らしを守る。
        </div>
      </div>
      <Toolbar
        onSave={onSave}
        onExportPNG={onExportPNG}
        onExportPDF={onExportPDF}
        onOpen={onOpen}
        onRotate={onRotate}
        onFitView={onFitView}
      />
      <div className="flex min-h-0 flex-1">
        <div className={`hidden shrink-0 sm:block ${sidebarOpen ? "w-48" : "w-0"}`}>
          <StampLibrary />
        </div>
        <div className="relative flex-1">
          <Canvas onReady={(h) => (handleRef.current = h)} />
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
          {/* Mobile sidebar overlays */}
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

      {openDialog && (
        <OpenDialog
          projects={projects}
          onClose={() => setOpenDialog(false)}
          onPick={async (id) => {
            const p = await loadProject(id);
            if (p) {
              loadInStore(p);
              setOpenDialog(false);
            }
          }}
          onNew={() => {
            useEditor.getState().newProject();
            setOpenDialog(false);
          }}
          onDelete={async (id) => {
            const { deleteProject } = await import("@/lib/db");
            await deleteProject(id);
            const list = await listProjects();
            setProjects(list);
          }}
        />
      )}
    </div>
  );
}

function OpenDialog({
  projects,
  onClose,
  onPick,
  onNew,
  onDelete,
}: {
  projects: FloorPlan[];
  onClose: () => void;
  onPick: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="font-semibold">プロジェクトを開く</div>
          <button className="text-slate-500 hover:text-slate-900" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          <button
            className="mb-2 w-full rounded border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
            onClick={onNew}
          >
            + 新規プロジェクト
          </button>
          {projects.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">
              保存されたプロジェクトはありません
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 rounded px-2 py-2 hover:bg-slate-50"
            >
              <button
                className="flex-1 text-left text-sm"
                onClick={() => onPick(p.id)}
              >
                <div className="font-medium text-slate-800">{p.name}</div>
                <div className="text-xs text-slate-400">
                  {new Date(p.updatedAt).toLocaleString("ja-JP")} ・ {p.elements.length} 要素
                </div>
              </button>
              <button
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`「${p.name}」を削除しますか？`)) onDelete(p.id);
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
