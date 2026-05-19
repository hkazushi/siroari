"use client";

import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useEditor } from "@/lib/store";
import { CHEMICAL_PRESETS, CHEMICAL_UNITS } from "@/lib/chemicals";
import { BUILDING_TEMPLATES } from "@/lib/templates";
import {
  listCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  listCustomChemicals,
  saveCustomChemical,
  deleteCustomChemical,
  type CustomTemplate,
  type CustomChemical,
} from "@/lib/db";
import type { ChemicalUse, AnyElement, StampPhoto, PhotoKind } from "@/types";
import { Trash2, Plus, Eraser, Star, Save as SaveIcon, Sparkles, Loader2 } from "lucide-react";
import { processAndUploadPhoto, photoSrc } from "@/lib/photoStorage";

// ===== Shared shell =====
export function DialogShell({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const maxW =
    size === "sm"
      ? "max-w-sm"
      : size === "lg"
        ? "max-w-2xl"
        : size === "xl"
          ? "max-w-4xl"
          : "max-w-lg";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`max-h-[92vh] w-full ${maxW} overflow-y-auto rounded-xl bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="font-bold text-[#1e3a5f]">{title}</div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== Visit Meta Dialog =====
export function VisitMetaDialog({ onClose }: { onClose: () => void }) {
  const ed = useEditor();
  const [form, setForm] = useState({
    visitNumber: ed.visitNumber ?? 1,
    visitDate: ed.visitDate
      ? new Date(ed.visitDate).toISOString().slice(0, 16)
      : "",
    nextVisitDate: ed.nextVisitDate
      ? new Date(ed.nextVisitDate).toISOString().slice(0, 10)
      : "",
    technicianName: ed.technicianName ?? "",
    technicianLicense: ed.technicianLicense ?? "",
    generalNotes: ed.generalNotes ?? "",
  });

  const submit = () => {
    ed.setVisitMeta({
      visitNumber: form.visitNumber || undefined,
      visitDate: form.visitDate ? new Date(form.visitDate).getTime() : undefined,
      nextVisitDate: form.nextVisitDate
        ? new Date(form.nextVisitDate).getTime()
        : undefined,
      technicianName: form.technicianName.trim() || undefined,
      technicianLicense: form.technicianLicense.trim() || undefined,
      generalNotes: form.generalNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <DialogShell title="訪問情報 / 担当者" onClose={onClose}>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="施工回数">
            <input
              type="number"
              value={form.visitNumber}
              min={1}
              onChange={(e) =>
                setForm({ ...form, visitNumber: Number(e.target.value) })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="施工日時">
            <input
              type="datetime-local"
              value={form.visitDate}
              onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="次回訪問予定日">
          <input
            type="date"
            value={form.nextVisitDate}
            onChange={(e) =>
              setForm({ ...form, nextVisitDate: e.target.value })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="担当技術者">
            <input
              value={form.technicianName}
              onChange={(e) =>
                setForm({ ...form, technicianName: e.target.value })
              }
              placeholder="氏名"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="資格番号">
            <input
              value={form.technicianLicense}
              onChange={(e) =>
                setForm({ ...form, technicianLicense: e.target.value })
              }
              placeholder="第○号"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <Field label="所見・備考">
          <VoiceTextArea
            value={form.generalNotes}
            onChange={(v) => setForm({ ...form, generalNotes: v })}
            rows={3}
            placeholder="現場で気付いた点、改善提案、注意事項など（音声入力可）"
          />
        </Field>
      </div>
      <DialogFooter onClose={onClose} onSubmit={submit} submitLabel="保存" />
    </DialogShell>
  );
}

// ===== Chemicals Dialog =====
export function ChemicalsDialog({ onClose }: { onClose: () => void }) {
  const { chemicals, addChemical, updateChemical, removeChemical } = useEditor();
  const [customs, setCustoms] = useState<CustomChemical[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [draft, setDraft] = useState<ChemicalUse>({
    id: nanoid(8),
    name: "",
    activeIngredient: "",
    amount: 0,
    unit: "ml",
    dilution: "",
    location: "",
  });

  const refreshCustoms = async () => {
    setCustoms(await listCustomChemicals());
  };
  useEffect(() => {
    let c = false;
    (async () => {
      const list = await listCustomChemicals();
      if (!c) setCustoms(list);
    })();
    return () => {
      c = true;
    };
  }, []);

  // All presets = custom (first) + built-in
  const allPresets = [
    ...customs.map((c) => ({
      name: c.name,
      activeIngredient: c.activeIngredient ?? "",
      unit: c.unit,
      defaultDilution: c.defaultDilution,
      target: c.target ?? "",
      isCustom: true,
    })),
    ...CHEMICAL_PRESETS.map((p) => ({ ...p, isCustom: false })),
  ];

  const applyPreset = (presetName: string) => {
    const p = allPresets.find((x) => x.name === presetName);
    if (!p) return;
    setDraft({
      ...draft,
      name: p.name,
      activeIngredient: p.activeIngredient,
      unit: p.unit,
      dilution: p.defaultDilution ?? "",
    });
  };

  const saveAsCustomPreset = async () => {
    if (!draft.name.trim()) {
      alert("薬剤名を入力してください");
      return;
    }
    await saveCustomChemical({
      id: nanoid(10),
      name: draft.name.trim(),
      activeIngredient: draft.activeIngredient?.trim() || undefined,
      unit: draft.unit,
      defaultDilution: draft.dilution?.trim() || undefined,
      target: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await refreshCustoms();
    setShowSavePreset(false);
    alert("自社プリセットに保存しました");
  };

  const addCurrent = () => {
    if (!draft.name.trim() || draft.amount <= 0) {
      alert("薬剤名と使用量を入力してください");
      return;
    }
    addChemical({ ...draft });
    setDraft({
      id: nanoid(8),
      name: "",
      activeIngredient: "",
      amount: 0,
      unit: "ml",
      dilution: "",
      location: "",
    });
  };

  return (
    <DialogShell
      title="薬剤使用記録（建築物衛生法対応）"
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          ⚠️ 建築物衛生法・PRTR
          法により、害虫防除作業での薬剤使用記録の保管が義務付けられています。
        </div>

        {/* Existing list */}
        {chemicals.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1.5 text-left">薬剤名</th>
                  <th className="px-2 py-1.5 text-left">有効成分</th>
                  <th className="px-2 py-1.5 text-left w-20">希釈</th>
                  <th className="px-2 py-1.5 text-right w-24">使用量</th>
                  <th className="px-2 py-1.5 text-left">使用箇所</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {chemicals.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      <input
                        value={c.name}
                        onChange={(e) =>
                          updateChemical(c.id, { name: e.target.value })
                        }
                        className="w-full bg-transparent text-[11px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        value={c.activeIngredient ?? ""}
                        onChange={(e) =>
                          updateChemical(c.id, {
                            activeIngredient: e.target.value,
                          })
                        }
                        className="w-full bg-transparent text-[11px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        value={c.dilution ?? ""}
                        onChange={(e) =>
                          updateChemical(c.id, { dilution: e.target.value })
                        }
                        placeholder="200倍"
                        className="w-full bg-transparent text-[11px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={c.amount}
                          onChange={(e) =>
                            updateChemical(c.id, {
                              amount: Number(e.target.value) || 0,
                            })
                          }
                          className="w-14 bg-transparent text-right text-[11px] outline-none"
                        />
                        <select
                          value={c.unit}
                          onChange={(e) =>
                            updateChemical(c.id, {
                              unit: e.target.value as ChemicalUse["unit"],
                            })
                          }
                          className="bg-transparent text-[11px] outline-none"
                        >
                          {CHEMICAL_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        value={c.location ?? ""}
                        onChange={(e) =>
                          updateChemical(c.id, { location: e.target.value })
                        }
                        className="w-full bg-transparent text-[11px] outline-none"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => removeChemical(c.id)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new */}
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-3">
          <div className="mb-2 text-[11px] font-bold text-[#1e3a5f]">
            新規追加
          </div>
          <div className="mb-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) applyPreset(e.target.value);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">プリセットから選択（任意）</option>
              {customs.length > 0 && (
                <optgroup label="⭐ 自社プリセット">
                  {customs.map((c) => (
                    <option key={`c-${c.id}`} value={c.name}>
                      {c.name}
                      {c.target ? ` — ${c.target}` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="標準プリセット">
                {CHEMICAL_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} — {p.target}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="薬剤名 *">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="有効成分">
              <input
                value={draft.activeIngredient ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, activeIngredient: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="希釈倍率">
              <input
                value={draft.dilution ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, dilution: e.target.value })
                }
                placeholder="200倍 / 1:50"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="使用量 *">
              <div className="flex gap-1">
                <input
                  type="number"
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: Number(e.target.value) || 0 })
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <select
                  value={draft.unit}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      unit: e.target.value as ChemicalUse["unit"],
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {CHEMICAL_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.value}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
          <Field label="使用箇所">
            <input
              value={draft.location ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, location: e.target.value })
              }
              placeholder="厨房・廊下・トイレなど"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={addCurrent}
              className="inline-flex items-center gap-1 rounded-md bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#152a47]"
            >
              <Plus size={14} /> リストに追加
            </button>
            <button
              onClick={saveAsCustomPreset}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#1e3a5f] hover:bg-slate-50"
              title="この内容を自社プリセットに保存し、次回から呼び出せるようにします"
            >
              <Star size={12} /> プリセットに登録
            </button>
            {customs.length > 0 && (
              <button
                onClick={() => setShowSavePreset((v) => !v)}
                className="ml-auto text-[10px] text-slate-500 underline-offset-2 hover:underline"
              >
                {showSavePreset ? "プリセット管理を閉じる" : "プリセット管理"}
              </button>
            )}
          </div>
          {showSavePreset && customs.length > 0 && (
            <div className="mt-2 rounded-md border border-slate-200 p-2">
              <div className="mb-1 text-[10px] font-bold text-slate-500">
                登録済み自社プリセット
              </div>
              <div className="space-y-1">
                {customs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px]"
                  >
                    <span>
                      {c.name}
                      {c.activeIngredient ? `（${c.activeIngredient}）` : ""}
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm(`「${c.name}」を削除しますか？`)) {
                          await deleteCustomChemical(c.id);
                          await refreshCustoms();
                        }
                      }}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <DialogFooter onClose={onClose} onSubmit={onClose} submitLabel="完了" />
    </DialogShell>
  );
}

// ===== Templates Dialog =====
export function TemplatesDialog({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (els: AnyElement[]) => void;
}) {
  const [customs, setCustoms] = useState<CustomTemplate[]>([]);
  const [showSave, setShowSave] = useState(false);
  const elements = useEditor((s) => s.elements);

  const refresh = async () => {
    setCustoms(await listCustomTemplates());
  };
  useEffect(() => {
    let c = false;
    (async () => {
      const list = await listCustomTemplates();
      if (!c) setCustoms(list);
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <DialogShell title="建物テンプレートを適用" onClose={onClose} size="lg">
      <div className="space-y-3 p-4">
        <div className="text-[11px] text-slate-500">
          選んだテンプレートが現在の図に追加されます。空から始めたいときは「白紙」を選んでください。
        </div>

        {/* Custom templates section */}
        {customs.length > 0 && (
          <div>
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-[#991b1b]">
              <Star size={12} /> 自社テンプレート
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {customs.map((t) => (
                <div
                  key={t.id}
                  className="group relative rounded-lg border-2 border-[#1e3a5f] bg-white p-4 text-left hover:bg-blue-50/30"
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => {
                      onApply(t.elements);
                      onClose();
                    }}
                  >
                    <div className="text-[10px] font-bold text-[#1e3a5f]">
                      {t.category}
                    </div>
                    <div className="mt-1 font-bold text-[#1e3a5f]">{t.name}</div>
                    {t.description && (
                      <div className="mt-1 text-[11px] text-slate-600">
                        {t.description}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-slate-400">
                      {t.elements.length} 要素
                    </div>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`「${t.name}」を削除しますか？`)) {
                        await deleteCustomTemplate(t.id);
                        await refresh();
                      }
                    }}
                    className="absolute right-1 top-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Built-in templates */}
        <div>
          <div className="mb-1 text-[11px] font-bold text-slate-500">
            標準テンプレート
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUILDING_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onApply(t.buildElements());
                  onClose();
                }}
                className="group rounded-lg border-2 border-slate-200 bg-white p-4 text-left hover:border-[#991b1b] hover:bg-red-50/30"
              >
                <div className="text-[10px] font-bold text-[#991b1b]">
                  {t.category}
                </div>
                <div className="mt-1 font-bold text-[#1e3a5f]">{t.name}</div>
                <div className="mt-1 text-[11px] text-slate-600">
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save current as template */}
        {elements.length > 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-3">
            {showSave ? (
              <SaveTemplateForm
                onCancel={() => setShowSave(false)}
                onSaved={async () => {
                  setShowSave(false);
                  await refresh();
                }}
              />
            ) : (
              <button
                onClick={() => setShowSave(true)}
                className="flex w-full items-center justify-center gap-1 rounded-md bg-[#1e3a5f] px-3 py-2 text-sm font-bold text-white hover:bg-[#152a47]"
              >
                <SaveIcon size={14} /> 現在のマップを自社テンプレに保存
              </button>
            )}
          </div>
        )}
      </div>
      <DialogFooter onClose={onClose} onSubmit={onClose} submitLabel="閉じる" />
    </DialogShell>
  );
}

function SaveTemplateForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const elements = useEditor((s) => s.elements);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("住宅");
  const [description, setDescription] = useState("");

  const submit = async () => {
    if (!name.trim()) {
      alert("テンプレ名を入力してください");
      return;
    }
    await saveCustomTemplate({
      id: nanoid(10),
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      elements,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    onSaved();
  };

  return (
    <div className="space-y-2">
      <Field label="テンプレ名 *">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: ○○ビル定型 / 中華料理店パターン"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <Field label="カテゴリ">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="住宅">住宅</option>
          <option value="店舗">店舗</option>
          <option value="オフィス">オフィス</option>
          <option value="倉庫">倉庫</option>
          <option value="工場">工場</option>
          <option value="その他">その他</option>
        </select>
      </Field>
      <Field label="説明">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="どんな現場用か（任意）"
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
        >
          キャンセル
        </button>
        <button
          onClick={submit}
          className="rounded-md bg-[#991b1b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d]"
        >
          保存（{elements.length} 要素）
        </button>
      </div>
    </div>
  );
}

// ===== Signature Pad =====
export function SignatureDialog({
  onClose,
  who,
}: {
  onClose: () => void;
  who: "customer" | "technician";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const getPos = (e: PointerEvent | React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    drawingRef.current = true;
    lastRef.current = getPos(e);
    setIsEmpty(false);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    const last = lastRef.current ?? p;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const onUp = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };
  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    setIsEmpty(true);
  };
  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    const data = c.toDataURL("image/png");
    if (who === "customer") {
      useEditor.getState().setVisitMeta({ customerSignature: data });
    } else {
      useEditor.getState().setVisitMeta({ technicianSignature: data });
    }
    onClose();
  };

  return (
    <DialogShell
      title={
        who === "customer"
          ? "お客様 ご確認サイン"
          : "施工担当者サイン"
      }
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-3 p-4">
        <div className="text-[11px] text-slate-500">
          下の枠内に指 / Apple Pencil でサインしてください。
        </div>
        <canvas
          ref={canvasRef}
          width={640}
          height={240}
          className="w-full touch-none rounded-lg border-2 border-slate-300 bg-white"
          style={{ aspectRatio: "640 / 240" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
        <div className="flex justify-between">
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eraser size={12} /> 消す
          </button>
          <button
            onClick={save}
            disabled={isEmpty}
            className="rounded-md bg-[#991b1b] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d] disabled:opacity-40"
          >
            サインを保存
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

// ===== Photo Attachment Dialog =====
export function StampPhotoDialog({
  stampId,
  onClose,
}: {
  stampId: string;
  onClose: () => void;
}) {
  const ed = useEditor();
  const stamp = ed.elements.find((e) => e.id === stampId);
  const [uploading, setUploading] = useState(false);
  const [defaultKind, setDefaultKind] = useState<PhotoKind>("before");
  if (!stamp || stamp.type !== "stamp") return null;
  const photos = stamp.photos ?? [];

  const onPick = async (file: File) => {
    setUploading(true);
    try {
      const result = await processAndUploadPhoto(file, `visits/${ed.projectId ?? "draft"}/stamps/${stampId}`);
      ed.attachPhotoToStamp(stampId, {
        id: nanoid(8),
        ...result,
        kind: defaultKind,
        takenAt: Date.now(),
      });
    } finally {
      setUploading(false);
    }
  };

  const updatePhotoKind = (photoId: string, kind: PhotoKind) => {
    const idx = ed.elements.findIndex((e) => e.id === stampId);
    if (idx === -1) return;
    const el = ed.elements[idx];
    if (el.type !== "stamp") return;
    const nextPhotos = (el.photos ?? []).map((p) =>
      p.id === photoId ? { ...p, kind } : p,
    );
    ed.updateElement(stampId, { photos: nextPhotos });
  };

  const beforePhotos = photos.filter((p) => p.kind === "before");
  const afterPhotos = photos.filter((p) => p.kind === "after");
  const otherPhotos = photos.filter((p) => !p.kind || p.kind === "other");

  return (
    <DialogShell title="現場写真の添付（施工前 / 施工後 対応）" onClose={onClose} size="lg">
      <div className="space-y-3 p-4">
        <div className="text-[11px] text-slate-500">
          このスタンプ箇所の写真を撮影 / 選択して添付できます。撮影前にラベルを選んでください。
        </div>

        {/* Kind selector */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              { v: "before", label: "🔴 施工前" },
              { v: "after", label: "🟢 施工後" },
              { v: "other", label: "📷 その他" },
            ] as { v: PhotoKind; label: string }[]
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setDefaultKind(opt.v)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                defaultKind === opt.v
                  ? "bg-white text-[#1e3a5f] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#1e3a5f] px-4 py-2 text-sm font-bold text-white hover:bg-[#152a47] ${
            uploading ? "opacity-60" : ""
          }`}
        >
          <Plus size={14} />
          {uploading
            ? "アップロード中..."
            : `「${defaultKind === "before" ? "施工前" : defaultKind === "after" ? "施工後" : "その他"}」として撮影 / 選択`}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
        </label>

        {photos.length === 0 ? (
          <div className="rounded-lg bg-slate-50 p-6 text-center text-[11px] text-slate-500">
            まだ写真が添付されていません
          </div>
        ) : (
          <div className="space-y-3">
            <PhotoGroup
              title="🔴 施工前"
              photos={beforePhotos}
              onRemove={(id) => ed.removePhotoFromStamp(stampId, id)}
              onKindChange={updatePhotoKind}
            />
            <PhotoGroup
              title="🟢 施工後"
              photos={afterPhotos}
              onRemove={(id) => ed.removePhotoFromStamp(stampId, id)}
              onKindChange={updatePhotoKind}
            />
            <PhotoGroup
              title="📷 その他"
              photos={otherPhotos}
              onRemove={(id) => ed.removePhotoFromStamp(stampId, id)}
              onKindChange={updatePhotoKind}
            />
          </div>
        )}
      </div>
      <DialogFooter onClose={onClose} onSubmit={onClose} submitLabel="閉じる" />
    </DialogShell>
  );
}

function PhotoGroup({
  title,
  photos,
  onRemove,
  onKindChange,
}: {
  title: string;
  photos: StampPhoto[];
  onRemove: (id: string) => void;
  onKindChange: (id: string, kind: PhotoKind) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-slate-600">
        {title} ({photos.length})
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            onRemove={() => onRemove(p.id)}
            onKindChange={(k) => onKindChange(p.id, k)}
          />
        ))}
      </div>
    </div>
  );
}

function PhotoCard({
  photo,
  onRemove,
  onKindChange,
}: {
  photo: StampPhoto;
  onRemove: () => void;
  onKindChange: (k: PhotoKind) => void;
}) {
  const src = photoSrc(photo);
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<{
    identified: boolean;
    species?: string;
    confidence?: string;
    description?: string;
    recommendations?: string[];
  } | null>(null);

  const identify = async () => {
    if (!src) return;
    setIdentifying(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/identify-pest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photo.data,
          imageUrl: photo.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "判別失敗");
      setResult(data);
    } catch (e) {
      setResult({
        identified: false,
        description: "❌ " + (e as Error).message,
      });
    } finally {
      setIdentifying(false);
    }
  };

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="現場写真"
        className="aspect-square w-full rounded border border-slate-200 object-cover"
      />
      <select
        value={photo.kind ?? "other"}
        onChange={(e) => onKindChange(e.target.value as PhotoKind)}
        className="absolute bottom-1 left-1 rounded bg-white/90 px-1 py-0.5 text-[9px] shadow"
      >
        <option value="before">🔴 施工前</option>
        <option value="after">🟢 施工後</option>
        <option value="other">📷 その他</option>
      </select>
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-500 shadow hover:bg-white"
      >
        <Trash2 size={12} />
      </button>
      <button
        onClick={identify}
        disabled={identifying}
        className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-[9px] font-bold text-white shadow hover:from-amber-600 hover:to-rose-600 disabled:opacity-60"
        title="AI で害虫判別"
      >
        {identifying ? (
          <Loader2 size={9} className="animate-spin" />
        ) : (
          <Sparkles size={9} />
        )}
        AI 判別
      </button>
      {result && (
        <div className="mt-1 rounded border border-emerald-300 bg-emerald-50 p-1.5 text-[10px]">
          {result.identified ? (
            <>
              <div className="font-bold text-emerald-800">
                {result.species}
                {result.confidence && (
                  <span className="ml-1 text-[9px]">
                    （確信度 {result.confidence}）
                  </span>
                )}
              </div>
              {result.description && (
                <div className="mt-0.5 text-emerald-700">
                  {result.description}
                </div>
              )}
              {result.recommendations && result.recommendations.length > 0 && (
                <ul className="ml-3 mt-1 list-disc text-emerald-700">
                  {result.recommendations.slice(0, 3).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="text-slate-600">
              {result.description ?? "害虫は識別できませんでした"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { VoiceTextArea } from "@/components/VoiceTextArea";
export { VoiceTextArea };

// ===== Helpers =====
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">
        {label}
      </div>
      {children}
    </label>
  );
}

function DialogFooter({
  onClose,
  onSubmit,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <button
        onClick={onClose}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        キャンセル
      </button>
      <button
        onClick={onSubmit}
        className="rounded-md bg-[#991b1b] px-4 py-2 text-sm font-bold text-white hover:bg-[#7f1d1d]"
      >
        {submitLabel}
      </button>
    </div>
  );
}
