"use client";

import {
  MousePointer2,
  Hand,
  Minus,
  Square,
  Stamp as StampIcon,
  Type,
  Ruler,
  Eraser,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Magnet,
  Trash2,
  Save,
  FileDown,
  FolderOpen,
  RotateCw,
  Maximize2,
} from "lucide-react";
import { useEditor } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ToolType } from "@/types";
import { useState } from "react";

type ToolBtn = {
  id: ToolType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  hotkey?: string;
};

const TOOLS: ToolBtn[] = [
  { id: "select", label: "選択", icon: MousePointer2, hotkey: "V" },
  { id: "pan", label: "移動", icon: Hand, hotkey: "H" },
  { id: "wall", label: "壁", icon: Minus, hotkey: "W" },
  { id: "room", label: "部屋", icon: Square, hotkey: "R" },
  { id: "stamp", label: "スタンプ", icon: StampIcon, hotkey: "S" },
  { id: "text", label: "文字", icon: Type, hotkey: "T" },
  { id: "dimension", label: "寸法", icon: Ruler, hotkey: "D" },
  { id: "eraser", label: "削除", icon: Eraser, hotkey: "E" },
];

export function Toolbar({
  onSave,
  onExportPNG,
  onExportPDF,
  onOpen,
  onRotate,
  onFitView,
}: {
  onSave: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onOpen: () => void;
  onRotate: () => void;
  onFitView: () => void;
}) {
  const {
    tool,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    zoomAt,
    stageSize,
    selectedIds,
    deleteSelected,
    name,
    setName,
  } = useEditor();

  const [menuOpen, setMenuOpen] = useState(false);

  const zoomCenter = { x: stageSize.width / 2, y: stageSize.height / 2 };

  return (
    <div className="flex w-full flex-col gap-1 border-b bg-white px-2 py-1.5 shadow-sm">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <input
          className="w-44 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400 sm:w-64"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <IconBtn label="開く" icon={FolderOpen} onClick={onOpen} />
          <IconBtn label="保存" icon={Save} onClick={onSave} />
          <IconBtn label="PNG" icon={FileDown} onClick={onExportPNG} />
          <IconBtn label="PDF" icon={FileDown} onClick={onExportPDF} />
        </div>
        <button
          className="ml-auto rounded border border-slate-200 px-2 py-1 text-xs sm:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          メニュー
        </button>
      </div>

      {menuOpen && (
        <div className="grid grid-cols-2 gap-1 sm:hidden">
          <IconBtn label="開く" icon={FolderOpen} onClick={onOpen} />
          <IconBtn label="保存" icon={Save} onClick={onSave} />
          <IconBtn label="PNG出力" icon={FileDown} onClick={onExportPNG} />
          <IconBtn label="PDF出力" icon={FileDown} onClick={onExportPDF} />
        </div>
      )}

      {/* Tool row */}
      <div className="flex flex-wrap items-center gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={cn(
              "flex h-9 min-w-9 items-center gap-1 rounded px-2 text-xs transition-colors",
              tool === t.id
                ? "bg-[#991b1b] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
            onClick={() => setTool(t.id)}
            title={`${t.label}${t.hotkey ? ` (${t.hotkey})` : ""}`}
          >
            <t.icon size={16} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}

        <div className="mx-1 h-6 w-px bg-slate-200" />

        <IconBtn label="" icon={Undo2} onClick={undo} disabled={!canUndo()} title="元に戻す (Ctrl+Z)" />
        <IconBtn label="" icon={Redo2} onClick={redo} disabled={!canRedo()} title="やり直し (Ctrl+Shift+Z)" />

        <div className="mx-1 h-6 w-px bg-slate-200" />

        <IconBtn label="" icon={ZoomIn} onClick={() => zoomAt(1.2, zoomCenter)} title="拡大" />
        <IconBtn label="" icon={ZoomOut} onClick={() => zoomAt(1 / 1.2, zoomCenter)} title="縮小" />
        <IconBtn label="" icon={Maximize2} onClick={onFitView} title="全体表示" />

        <div className="mx-1 h-6 w-px bg-slate-200" />

        <button
          className={cn(
            "flex h-9 items-center gap-1 rounded px-2 text-xs",
            showGrid ? "bg-red-50 text-[#991b1b]" : "bg-slate-100 text-slate-600",
          )}
          onClick={() => setShowGrid(!showGrid)}
          title="グリッド表示"
        >
          <Grid3x3 size={16} />
        </button>
        <button
          className={cn(
            "flex h-9 items-center gap-1 rounded px-2 text-xs",
            snapToGrid ? "bg-red-50 text-[#991b1b]" : "bg-slate-100 text-slate-600",
          )}
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="グリッドにスナップ"
        >
          <Magnet size={16} />
        </button>

        {selectedIds.length > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <IconBtn label="回転" icon={RotateCw} onClick={onRotate} title="90°回転" />
            <IconBtn label="削除" icon={Trash2} onClick={deleteSelected} title="削除 (Del)" />
          </>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={cn(
        "flex h-9 items-center gap-1 rounded px-2 text-xs",
        disabled
          ? "bg-slate-50 text-slate-300"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      <Icon size={16} />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
