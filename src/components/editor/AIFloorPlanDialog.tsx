"use client";

import { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { useEditor } from "@/lib/store";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { DialogShell } from "./Dialogs";
import { stampDefOf } from "@/lib/stamps";
import { compressImage, fileToDataUrl } from "@/lib/photoStorage";
import type { AnyElement, Room, Stamp, StampType } from "@/types";
import {
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  RotateCcw,
  Mic as MicIcon,
  Camera,
  PenLine,
  Upload,
} from "lucide-react";

type Mode = "text" | "photo" | "canvas";

const SAMPLES = [
  "LDK 12畳、北側に寝室 6畳、寝室の隣に浴室 4畳半。キッチンにゴキブリ 3 匹、リビング東側でも 2 匹発見。トイレに毒餌設置済。",
  "飲食店です。客席 20畳、奥に厨房 8畳、バックヤード 4畳、トイレ 1畳。厨房のシンク下にゴキブリ多数、バックヤードでネズミ 1 匹。粘着シート 3 枚設置、薬剤散布範囲は厨房全体。",
  "個人住宅 3LDK。LDK 12畳、隣に和室 6畳、廊下挟んで寝室 8畳、子供部屋 6畳、浴室、トイレ、洗面所。玄関の隙間が侵入経路。",
];

type AIRoomOut = {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};
type AIStampOut = {
  stampType: StampType;
  label?: string;
  roomLabel?: string;
  hintX?: "left" | "center" | "right";
  hintY?: "top" | "center" | "bottom";
  count?: number;
};
type AIPlan = {
  rooms: AIRoomOut[];
  stamps: AIStampOut[];
  notes?: string;
};

export function AIFloorPlanDialog({
  onClose,
  initialMode = "text",
  canvasSnapshot,
}: {
  onClose: () => void;
  initialMode?: Mode;
  /** モード "canvas" の時に渡されるキャンバスのデータ URL */
  canvasSnapshot?: string | null;
}) {
  const ed = useEditor();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState("");
  const [hint, setHint] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    initialMode === "canvas" ? (canvasSnapshot ?? null) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AIPlan | null>(null);
  const [applyMode, setApplyMode] = useState<"replace" | "append">(
    ed.elements.length > 0 && initialMode !== "canvas" ? "append" : "replace",
  );

  const accumulatedRef = useRef("");
  useEffect(() => {
    accumulatedRef.current = text;
  }, [text]);
  const voice = useVoiceInput({
    lang: "ja-JP",
    onFinal: (t) => {
      const next = (
        accumulatedRef.current + (accumulatedRef.current ? " " : "") + t
      ).trim();
      accumulatedRef.current = next;
      setText(next);
    },
  });

  const onPickPhoto = async (file: File) => {
    try {
      const compressed = await compressImage(file, 1280);
      const data = await fileToDataUrl(compressed);
      setPhotoDataUrl(data);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const generate = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "text") {
        if (!text.trim()) {
          throw new Error("間取りの説明を入力してください");
        }
        const res = await fetch("/api/ai/floor-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: text,
            existing:
              applyMode === "append" && ed.elements.length > 0
                ? sanitizeExisting(ed.elements)
                : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "生成失敗");
        setPreview(data as AIPlan);
      } else {
        // photo / canvas 共通フロー
        if (!photoDataUrl) {
          throw new Error(
            mode === "photo"
              ? "画像を選択してください"
              : "キャンバス画像が取得できません",
          );
        }
        const res = await fetch("/api/ai/sketch-to-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: photoDataUrl,
            hint: hint || (mode === "canvas" ? "キャンバスに描かれた手描きラフ" : undefined),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "生成失敗");
        setPreview(data as AIPlan);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    const newElements = aiPlanToElements(preview);
    if (applyMode === "replace" || mode === "canvas") {
      // canvas モードはスケッチを消す + 既存も消す
      useEditor.setState({ elements: [], past: [], future: [], selectedIds: [] });
    }
    ed.addElements(newElements);
    onClose();
  };

  const title =
    mode === "text"
      ? "🎙️ AI で間取り作成"
      : mode === "photo"
        ? "📷 手描き図面の写真から間取り作成"
        : "✍️ 手描きを整形して反映";

  return (
    <DialogShell title={title} onClose={onClose} size="xl">
      <div className="space-y-3 p-4">
        {/* Mode tabs (canvas モード固定時はタブ非表示) */}
        {initialMode !== "canvas" && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            <ModeBtn
              active={mode === "text"}
              onClick={() => {
                setMode("text");
                setPreview(null);
              }}
              icon={<MicIcon size={12} />}
              label="音声 / テキスト"
            />
            <ModeBtn
              active={mode === "photo"}
              onClick={() => {
                setMode("photo");
                setPreview(null);
              }}
              icon={<Camera size={12} />}
              label="写真から"
            />
          </div>
        )}

        <div className="rounded-lg bg-gradient-to-br from-amber-50 to-rose-50 p-3 text-[12px] text-slate-700 ring-1 ring-amber-200">
          <div className="flex items-center gap-1.5 font-bold text-[#991b1b]">
            <Sparkles size={14} /> AI 間取りアシスタント
          </div>
          <div className="mt-1">
            {mode === "text" && "音声 or テキストで現場を説明 → AI が自動で間取り図・害虫・施工内容を描画。"}
            {mode === "photo" && "現場で取ったメモ（紙の手描き図面）の写真を読み込ませると、清書された間取りに変換します。"}
            {mode === "canvas" && "キャンバスに手描きしたラフスケッチを AI が解析 → 整った間取りに置き換えます。"}
          </div>
        </div>

        {/* Mode-specific input */}
        {mode === "text" && (
          <>
            {ed.elements.length > 0 && (
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  onClick={() => setApplyMode("replace")}
                  className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${applyMode === "replace" ? "bg-white shadow-sm" : "text-slate-500"}`}
                >
                  既存を消して新規生成
                </button>
                <button
                  onClick={() => setApplyMode("append")}
                  className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${applyMode === "append" ? "bg-white shadow-sm" : "text-slate-500"}`}
                >
                  既存に追加・修正
                </button>
              </div>
            )}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => {
                  accumulatedRef.current = e.target.value;
                  setText(e.target.value);
                }}
                rows={5}
                placeholder="例: LDK 12畳、北側に寝室 6畳、キッチンにゴキブリ 3 匹発見"
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-12 text-sm"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={() =>
                    voice.listening ? voice.stop() : voice.start()
                  }
                  title={voice.listening ? "停止" : "音声入力"}
                  className={`absolute right-2 top-2 rounded-full p-2 ${
                    voice.listening
                      ? "animate-pulse bg-red-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500">
                サンプル（タップで入力）
              </div>
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setText(s)}
                  className="block w-full rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[11px] text-slate-600 hover:bg-slate-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {(mode === "photo" || mode === "canvas") && (
          <>
            {mode === "photo" && (
              <div className="space-y-2">
                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-bold text-[#1e3a5f] hover:border-[#991b1b] hover:bg-red-50/30 ${photoDataUrl ? "border-emerald-300 bg-emerald-50" : ""}`}
                >
                  {photoDataUrl ? (
                    <>
                      <Upload size={16} className="text-emerald-600" />
                      画像を選択済（タップで変更）
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      手描き図面の写真を撮影 / 選択
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickPhoto(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
            {photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoDataUrl}
                alt="入力画像"
                className="max-h-56 w-full rounded border border-slate-200 object-contain"
              />
            )}
            <label className="block">
              <div className="mb-1 text-[10px] font-bold text-slate-500">
                補足情報（任意）
              </div>
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例: 飲食店 1F、LDK は手前、ゴキブリ印は厨房"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </>
        )}

        {!preview && (
          <button
            onClick={generate}
            disabled={
              loading ||
              (mode === "text" && !text.trim()) ||
              ((mode === "photo" || mode === "canvas") && !photoDataUrl)
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#991b1b] px-4 py-3 text-sm font-bold text-white hover:bg-[#7f1d1d] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                AI が解析中... (5〜15 秒)
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {mode === "text"
                  ? "AI に間取りを描かせる"
                  : mode === "photo"
                    ? "写真から間取り生成"
                    : "手描きを整形する"}
              </>
            )}
          </button>
        )}

        {error && (
          <div className="rounded bg-red-50 px-3 py-2 text-[12px] text-red-700">
            ❌ {error}
          </div>
        )}

        {preview && (
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/50 p-3">
            <div className="mb-2 text-[11px] font-bold text-emerald-700">
              ✨ 生成結果プレビュー
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="font-bold text-[#1e3a5f]">
                部屋（{preview.rooms.length} 個）
              </div>
              <ul className="ml-4 list-disc space-y-0.5 text-slate-700">
                {preview.rooms.map((r, i) => (
                  <li key={i}>
                    {r.label}（{Math.round(r.width)} × {Math.round(r.height)} mm）
                  </li>
                ))}
              </ul>
              {preview.stamps && preview.stamps.length > 0 && (
                <>
                  <div className="mt-2 font-bold text-[#1e3a5f]">
                    害虫・施工（{preview.stamps.length} 種）
                  </div>
                  <ul className="ml-4 list-disc space-y-0.5 text-slate-700">
                    {preview.stamps.map((s, i) => (
                      <li key={i}>
                        {stampDefOf(s.stampType).label}
                        {s.count ? ` × ${s.count}` : ""}
                        {s.roomLabel ? ` @ ${s.roomLabel}` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {preview.notes && (
                <div className="mt-2 rounded bg-white p-2 text-[10px] text-slate-500">
                  💡 {preview.notes}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={apply}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                ✅ {mode === "canvas" ? "手描きを置き換えて採用" : "この間取りを採用"}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw size={12} className="inline" /> 再生成
              </button>
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-3 py-1.5 font-semibold ${
        active ? "bg-white text-[#1e3a5f] shadow-sm" : "text-slate-500"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// helpers
function sanitizeExisting(elements: AnyElement[]) {
  return elements
    .filter((e) => e.type === "room" || e.type === "stamp")
    .map((e) => {
      if (e.type === "room") {
        const xs = e.points.map((p) => p.x);
        const ys = e.points.map((p) => p.y);
        return {
          label: e.label,
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      } else if (e.type === "stamp") {
        return {
          stampType: e.stampType,
          x: e.position.x,
          y: e.position.y,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function aiPlanToElements(plan: AIPlan): AnyElement[] {
  const out: AnyElement[] = [];
  const COLORS = [
    "#fef3c7",
    "#dbeafe",
    "#dcfce7",
    "#e0e7ff",
    "#fce7f3",
    "#cffafe",
    "#fef9c3",
  ];
  const roomsById = new Map<string, { x: number; y: number; w: number; h: number }>();
  plan.rooms.forEach((r, i) => {
    const x = snap(r.x, 910);
    const y = snap(r.y, 910);
    const w = Math.max(910, snap(r.width, 910));
    const h = Math.max(910, snap(r.height, 910));
    const id = nanoid(8);
    roomsById.set(r.label, { x, y, w, h });
    const room: Room = {
      id,
      type: "room",
      points: [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ],
      label: r.label,
      color: r.color ?? COLORS[i % COLORS.length],
      showArea: true,
    };
    out.push(room);
  });
  for (const s of plan.stamps ?? []) {
    const count = Math.max(1, Math.min(20, s.count ?? 1));
    const def = stampDefOf(s.stampType);
    const targetRoom = s.roomLabel ? roomsById.get(s.roomLabel) : undefined;
    for (let i = 0; i < count; i++) {
      const pos = stampPosition(targetRoom, s.hintX, s.hintY, i, count);
      const stamp: Stamp = {
        id: nanoid(8),
        type: "stamp",
        stampType: s.stampType,
        position: pos,
        rotation: 0,
        width: def.defaultWidth,
        height: def.defaultHeight,
        note: s.label,
      };
      out.push(stamp);
    }
  }
  return out;
}
function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}
function stampPosition(
  room: { x: number; y: number; w: number; h: number } | undefined,
  hintX?: "left" | "center" | "right",
  hintY?: "top" | "center" | "bottom",
  index = 0,
  total = 1,
): { x: number; y: number } {
  if (!room) {
    return { x: 1000 + index * 800, y: 1000 };
  }
  let cx = room.x + room.w / 2;
  let cy = room.y + room.h / 2;
  if (hintX === "left") cx = room.x + room.w * 0.25;
  else if (hintX === "right") cx = room.x + room.w * 0.75;
  if (hintY === "top") cy = room.y + room.h * 0.25;
  else if (hintY === "bottom") cy = room.y + room.h * 0.75;
  if (total > 1) {
    const offsetX = ((index % 3) - 1) * 400;
    const offsetY = (Math.floor(index / 3) - Math.floor(total / 6)) * 400;
    cx += offsetX;
    cy += offsetY;
  }
  return { x: cx, y: cy };
}

void PenLine; // for future
