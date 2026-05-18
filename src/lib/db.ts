"use client";

import Dexie, { type Table } from "dexie";
import type { FloorPlan } from "@/types";

class MadorichDB extends Dexie {
  projects!: Table<FloorPlan, string>;
  constructor() {
    super("madorich");
    this.version(1).stores({
      projects: "id, name, updatedAt",
    });
  }
}

let _db: MadorichDB | null = null;
export function db(): MadorichDB {
  if (!_db) _db = new MadorichDB();
  return _db;
}

export async function listProjects(): Promise<FloorPlan[]> {
  return db().projects.orderBy("updatedAt").reverse().toArray();
}

export async function saveProject(p: FloorPlan): Promise<void> {
  const existing = await db().projects.get(p.id);
  const next: FloorPlan = {
    ...p,
    createdAt: existing?.createdAt ?? p.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db().projects.put(next);
}

export async function loadProject(id: string): Promise<FloorPlan | undefined> {
  return db().projects.get(id);
}

export async function deleteProject(id: string): Promise<void> {
  await db().projects.delete(id);
}
