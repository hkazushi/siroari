"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  AnyElement,
  FloorPlan,
  Point,
  StampType,
  ToolType,
  Wall,
  Room,
  Stamp,
  TextLabel,
  Dimension,
} from "@/types";
import { stampDefOf } from "@/lib/stamps";

const MAX_HISTORY = 100;

type EditorState = {
  // Project
  projectId: string | null;
  name: string;
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
  // Tool
  tool: ToolType;
  activeStamp: StampType;
  // Selection
  selectedIds: string[];
  // Drafting
  draftStart: Point | null;
  // Stage size for rendering
  stageSize: { width: number; height: number };

  // Actions
  setStageSize: (w: number, h: number) => void;
  setTool: (t: ToolType) => void;
  setActiveStamp: (s: StampType) => void;
  setScale: (s: number) => void;
  setOffset: (o: Point) => void;
  zoomAt: (factor: number, focalCanvas: Point) => void;
  setShowGrid: (b: boolean) => void;
  setSnapToGrid: (b: boolean) => void;
  setName: (n: string) => void;
  setGridSize: (s: number) => void;

  setDraftStart: (p: Point | null) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  addElement: (el: AnyElement) => void;
  addWall: (start: Point, end: Point) => void;
  addRoomRect: (a: Point, b: Point) => void;
  addStamp: (pos: Point, stampType?: StampType, rotation?: number) => void;
  addText: (pos: Point, text: string) => void;
  addDimension: (start: Point, end: Point) => void;

  updateElement: (id: string, patch: Partial<AnyElement>) => void;
  deleteSelected: () => void;
  deleteElement: (id: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadProject: (p: FloorPlan) => void;
  newProject: (name?: string) => void;
  serialize: () => FloorPlan;
};

function commitHistory(state: EditorState): Partial<EditorState> {
  const past = [...state.past, state.elements].slice(-MAX_HISTORY);
  return { past, future: [] };
}

export const useEditor = create<EditorState>((set, get) => ({
  projectId: null,
  name: "新規現場",
  elements: [],
  gridSize: 910,
  paperSize: { width: 14560, height: 10920 }, // 16 x 12 半間 ≒ A3 ratio
  past: [],
  future: [],
  scale: 0.05, // 1mm = 0.05px → 1 grid (910mm) = 45.5px
  offset: { x: 80, y: 80 },
  showGrid: true,
  snapToGrid: true,
  tool: "select",
  activeStamp: "door",
  selectedIds: [],
  draftStart: null,
  stageSize: { width: 800, height: 600 },

  setStageSize: (w, h) => set({ stageSize: { width: w, height: h } }),
  setTool: (t) =>
    set({ tool: t, draftStart: null, selectedIds: t === "select" ? get().selectedIds : [] }),
  setActiveStamp: (s) => set({ activeStamp: s }),
  setScale: (s) => set({ scale: Math.min(0.5, Math.max(0.005, s)) }),
  setOffset: (o) => set({ offset: o }),
  zoomAt: (factor, focalCanvas) => {
    const { scale, offset } = get();
    const newScale = Math.min(0.5, Math.max(0.005, scale * factor));
    // Keep focal point stationary: world coord at focal stays same
    // worldX = (focalCanvas.x - offset.x) / scale  ; with newScale, newOffset = focalCanvas - worldX*newScale
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
  setName: (n) => set({ name: n }),
  setGridSize: (s) => set({ gridSize: s }),

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
    set((s) => ({
      ...commitHistory(s),
      elements: [...s.elements, el],
    })),

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
      return { ...commitHistory(s), elements: [...s.elements, stamp] };
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
      elements: [],
      past: [],
      future: [],
      selectedIds: [],
    }),

  serialize: (): FloorPlan => {
    const s = get();
    return {
      id: s.projectId ?? nanoid(10),
      name: s.name,
      elements: s.elements,
      gridSize: s.gridSize,
      paperSize: s.paperSize,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
}));
