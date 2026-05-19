"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  AnyElement,
  Visit,
  Point,
  StampType,
  ToolType,
  Wall,
  Room,
  Stamp,
  TextLabel,
  Dimension,
  ChemicalUse,
  StampPhoto,
} from "@/types";
import { stampDefOf } from "@/lib/stamps";

const MAX_HISTORY = 100;
const MAX_RECENT_STAMPS = 6;

type EditorState = {
  // Project / Visit
  projectId: string | null;
  name: string;
  customerId?: string;
  siteId?: string;
  visitNumber?: number;
  visitDate?: number;
  nextVisitDate?: number;
  technicianName?: string;
  technicianLicense?: string;
  generalNotes?: string;
  chemicals: ChemicalUse[];
  customerSignature?: string;
  technicianSignature?: string;
  // Map elements
  elements: AnyElement[];
  gridSize: number; // mm
  paperSize: { width: number; height: number }; // mm
  // History
  past: AnyElement[][];
  future: AnyElement[][];
  // View
  scale: number; // px per mm
  offset: Point; // px
  showGrid: boolean;
  snapToGrid: boolean;
  showCompass: boolean;
  showScaleBar: boolean;
  // Tool
  tool: ToolType;
  activeStamp: StampType;
  recentStamps: StampType[]; // 最近使ったスタンプ
  // Selection
  selectedIds: string[];
  // Drafting
  draftStart: Point | null;
  // Stage size for rendering
  stageSize: { width: number; height: number };

  // ===== Actions =====
  setStageSize: (w: number, h: number) => void;
  setTool: (t: ToolType) => void;
  setActiveStamp: (s: StampType) => void;
  setScale: (s: number) => void;
  setOffset: (o: Point) => void;
  zoomAt: (factor: number, focalCanvas: Point) => void;
  setShowGrid: (b: boolean) => void;
  setSnapToGrid: (b: boolean) => void;
  setShowCompass: (b: boolean) => void;
  setShowScaleBar: (b: boolean) => void;
  setName: (n: string) => void;
  setGridSize: (s: number) => void;

  // Visit metadata
  setVisitMeta: (patch: Partial<Pick<EditorState,
    | "customerId" | "siteId" | "visitNumber" | "visitDate" | "nextVisitDate"
    | "technicianName" | "technicianLicense" | "generalNotes"
    | "customerSignature" | "technicianSignature"
  >>) => void;
  setChemicals: (chems: ChemicalUse[]) => void;
  addChemical: (c: ChemicalUse) => void;
  updateChemical: (id: string, patch: Partial<ChemicalUse>) => void;
  removeChemical: (id: string) => void;

  setDraftStart: (p: Point | null) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  addElement: (el: AnyElement) => void;
  addElements: (els: AnyElement[]) => void;
  addWall: (start: Point, end: Point) => void;
  addRoomRect: (a: Point, b: Point) => void;
  addStamp: (pos: Point, stampType?: StampType, rotation?: number) => void;
  addText: (pos: Point, text: string) => void;
  addDimension: (start: Point, end: Point) => void;

  attachPhotoToStamp: (stampId: string, photo: StampPhoto) => void;
  removePhotoFromStamp: (stampId: string, photoId: string) => void;

  updateElement: (id: string, patch: Partial<AnyElement>) => void;
  deleteSelected: () => void;
  deleteElement: (id: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadProject: (p: Visit) => void;
  newProject: (name?: string) => void;
  serialize: () => Visit;
  applyTemplate: (els: AnyElement[]) => void;
  copyFromVisit: (v: Visit) => void;
};

function commitHistory(state: EditorState): Partial<EditorState> {
  const past = [...state.past, state.elements].slice(-MAX_HISTORY);
  return { past, future: [] };
}

function pushRecentStamp(
  list: StampType[],
  t: StampType,
): StampType[] {
  return [t, ...list.filter((x) => x !== t)].slice(0, MAX_RECENT_STAMPS);
}

export const useEditor = create<EditorState>((set, get) => ({
  projectId: null,
  name: "新規現場",
  customerId: undefined,
  siteId: undefined,
  visitNumber: undefined,
  visitDate: undefined,
  nextVisitDate: undefined,
  technicianName: undefined,
  technicianLicense: undefined,
  generalNotes: undefined,
  chemicals: [],
  customerSignature: undefined,
  technicianSignature: undefined,
  elements: [],
  gridSize: 910,
  paperSize: { width: 14560, height: 10920 },
  past: [],
  future: [],
  scale: 0.05,
  offset: { x: 80, y: 80 },
  showGrid: true,
  snapToGrid: true,
  showCompass: true,
  showScaleBar: true,
  tool: "select",
  activeStamp: "pestRoach",
  recentStamps: ["pestRoach", "baitStation", "pestRodent", "trapMouse", "sprayZone", "entryPoint"],
  selectedIds: [],
  draftStart: null,
  stageSize: { width: 800, height: 600 },

  setStageSize: (w, h) => set({ stageSize: { width: w, height: h } }),
  setTool: (t) =>
    set({ tool: t, draftStart: null, selectedIds: t === "select" ? get().selectedIds : [] }),
  setActiveStamp: (s) =>
    set((st) => ({ activeStamp: s, recentStamps: pushRecentStamp(st.recentStamps, s) })),
  setScale: (s) => set({ scale: Math.min(0.5, Math.max(0.005, s)) }),
  setOffset: (o) => set({ offset: o }),
  zoomAt: (factor, focalCanvas) => {
    const { scale, offset } = get();
    const newScale = Math.min(0.5, Math.max(0.005, scale * factor));
    const worldX = (focalCanvas.x - offset.x) / scale;
    const worldY = (focalCanvas.y - offset.y) / scale;
    set({
      scale: newScale,
      offset: {
        x: focalCanvas.x - worldX * newScale,
        y: focalCanvas.y - worldY * newScale,
      },
    });
  },
  setShowGrid: (b) => set({ showGrid: b }),
  setSnapToGrid: (b) => set({ snapToGrid: b }),
  setShowCompass: (b) => set({ showCompass: b }),
  setShowScaleBar: (b) => set({ showScaleBar: b }),
  setName: (n) => set({ name: n }),
  setGridSize: (s) => set({ gridSize: s }),

  setVisitMeta: (patch) => set(patch as Partial<EditorState>),
  setChemicals: (chems) => set({ chemicals: chems }),
  addChemical: (c) =>
    set((st) => ({ chemicals: [...st.chemicals, c] })),
  updateChemical: (id, patch) =>
    set((st) => ({
      chemicals: st.chemicals.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),
  removeChemical: (id) =>
    set((st) => ({ chemicals: st.chemicals.filter((c) => c.id !== id) })),

  setDraftStart: (p) => set({ draftStart: p }),

  select: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) =>
    set((s) =>
      s.selectedIds.includes(id)
        ? { selectedIds: s.selectedIds.filter((x) => x !== id) }
        : { selectedIds: [...s.selectedIds, id] },
    ),
  clearSelection: () => set({ selectedIds: [] }),

  addElement: (el) =>
    set((s) => ({ ...commitHistory(s), elements: [...s.elements, el] })),

  addElements: (els) =>
    set((s) => ({ ...commitHistory(s), elements: [...s.elements, ...els] })),

  addWall: (start, end) =>
    set((s) => {
      const wall: Wall = {
        id: nanoid(8),
        type: "wall",
        start,
        end,
        thickness: 120,
      };
      return { ...commitHistory(s), elements: [...s.elements, wall] };
    }),

  addRoomRect: (a, b) =>
    set((s) => {
      const x1 = Math.min(a.x, b.x);
      const y1 = Math.min(a.y, b.y);
      const x2 = Math.max(a.x, b.x);
      const y2 = Math.max(a.y, b.y);
      const room: Room = {
        id: nanoid(8),
        type: "room",
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 },
        ],
        label: "",
        color: "#fff7e6",
        showArea: true,
      };
      return { ...commitHistory(s), elements: [...s.elements, room] };
    }),

  addStamp: (pos, stampType, rotation = 0) =>
    set((s) => {
      const t = stampType ?? s.activeStamp;
      const def = stampDefOf(t);
      const stamp: Stamp = {
        id: nanoid(8),
        type: "stamp",
        stampType: t,
        position: pos,
        rotation,
        width: def.defaultWidth,
        height: def.defaultHeight,
      };
      return {
        ...commitHistory(s),
        elements: [...s.elements, stamp],
        recentStamps: pushRecentStamp(s.recentStamps, t),
      };
    }),

  addText: (pos, text) =>
    set((s) => {
      const el: TextLabel = {
        id: nanoid(8),
        type: "text",
        position: pos,
        text,
        fontSize: 300,
        rotation: 0,
      };
      return { ...commitHistory(s), elements: [...s.elements, el] };
    }),

  addDimension: (start, end) =>
    set((s) => {
      const el: Dimension = {
        id: nanoid(8),
        type: "dimension",
        start,
        end,
        offset: 400,
      };
      return { ...commitHistory(s), elements: [...s.elements, el] };
    }),

  attachPhotoToStamp: (stampId, photo) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === stampId);
      if (idx === -1) return {};
      const el = s.elements[idx];
      if (el.type !== "stamp") return {};
      const next = [...s.elements];
      next[idx] = {
        ...el,
        photos: [...(el.photos ?? []), photo],
      };
      return { ...commitHistory(s), elements: next };
    }),

  removePhotoFromStamp: (stampId, photoId) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === stampId);
      if (idx === -1) return {};
      const el = s.elements[idx];
      if (el.type !== "stamp") return {};
      const next = [...s.elements];
      next[idx] = {
        ...el,
        photos: (el.photos ?? []).filter((p) => p.id !== photoId),
      };
      return { ...commitHistory(s), elements: next };
    }),

  updateElement: (id, patch) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1) return {};
      const next = [...s.elements];
      next[idx] = { ...next[idx], ...patch } as AnyElement;
      return { ...commitHistory(s), elements: next };
    }),

  deleteSelected: () =>
    set((s) => {
      if (s.selectedIds.length === 0) return {};
      return {
        ...commitHistory(s),
        elements: s.elements.filter((e) => !s.selectedIds.includes(e.id)),
        selectedIds: [],
      };
    }),

  deleteElement: (id) =>
    set((s) => ({
      ...commitHistory(s),
      elements: s.elements.filter((e) => e.id !== id),
      selectedIds: s.selectedIds.filter((x) => x !== id),
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [s.elements, ...s.future].slice(0, MAX_HISTORY),
        elements: prev,
        selectedIds: [],
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      return {
        past: [...s.past, s.elements].slice(-MAX_HISTORY),
        future: s.future.slice(1),
        elements: next,
        selectedIds: [],
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  loadProject: (p) =>
    set({
      projectId: p.id,
      name: p.name,
      customerId: p.customerId,
      siteId: p.siteId,
      visitNumber: p.visitNumber,
      visitDate: p.visitDate,
      nextVisitDate: p.nextVisitDate,
      technicianName: p.technicianName,
      technicianLicense: p.technicianLicense,
      generalNotes: p.generalNotes,
      chemicals: p.chemicals ?? [],
      customerSignature: p.customerSignature,
      technicianSignature: p.technicianSignature,
      elements: p.elements,
      gridSize: p.gridSize,
      paperSize: p.paperSize,
      past: [],
      future: [],
      selectedIds: [],
    }),

  newProject: (name) =>
    set({
      projectId: null,
      name: name ?? "新規現場",
      customerId: undefined,
      siteId: undefined,
      visitNumber: undefined,
      visitDate: Date.now(),
      nextVisitDate: undefined,
      technicianName: undefined,
      technicianLicense: undefined,
      generalNotes: undefined,
      chemicals: [],
      customerSignature: undefined,
      technicianSignature: undefined,
      elements: [],
      past: [],
      future: [],
      selectedIds: [],
    }),

  applyTemplate: (els) =>
    set((s) => ({
      ...commitHistory(s),
      elements: [...s.elements, ...els],
    })),

  /** 同一現場の前回 visit から地図・薬剤をコピー（新規 ID 化） */
  copyFromVisit: (v) =>
    set((s) => {
      const cloned: AnyElement[] = v.elements.map((e) => ({
        ...e,
        id: nanoid(8),
      }));
      const clonedChems: ChemicalUse[] = (v.chemicals ?? []).map((c) => ({
        ...c,
        id: nanoid(8),
      }));
      return {
        ...commitHistory(s),
        elements: cloned,
        chemicals: clonedChems,
      };
    }),

  serialize: (): Visit => {
    const s = get();
    return {
      id: s.projectId ?? nanoid(10),
      name: s.name,
      customerId: s.customerId,
      siteId: s.siteId,
      visitNumber: s.visitNumber,
      visitDate: s.visitDate,
      nextVisitDate: s.nextVisitDate,
      technicianName: s.technicianName,
      technicianLicense: s.technicianLicense,
      generalNotes: s.generalNotes,
      chemicals: s.chemicals,
      customerSignature: s.customerSignature,
      technicianSignature: s.technicianSignature,
      elements: s.elements,
      gridSize: s.gridSize,
      paperSize: s.paperSize,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
}));
