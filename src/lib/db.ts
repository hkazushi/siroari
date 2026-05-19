"use client";

import Dexie, { type Table } from "dexie";
import type {
  Customer,
  Site,
  Visit,
  FloorPlan,
  AnyElement,
  ChemicalUse,
  StampType,
} from "@/types";

/** ユーザー定義テンプレート（自社で頻繁に出る現場パターン） */
export type CustomTemplate = {
  id: string;
  name: string;
  description?: string;
  category: string;
  elements: AnyElement[];
  createdAt: number;
  updatedAt: number;
};

/** ユーザー定義薬剤プリセット */
export type CustomChemical = {
  id: string;
  name: string;
  activeIngredient?: string;
  unit: ChemicalUse["unit"];
  defaultDilution?: string;
  target?: string;
  manufacturer?: string;
  createdAt: number;
  updatedAt: number;
};

/** ユーザー定義スタンプ（絵文字ベース） */
export type CustomStamp = {
  id: string;
  /** 基底になる組み込みスタンプ種別。見た目はこのまま、表示ラベルだけ差し替え */
  baseStampType: StampType;
  label: string;
  category: "害虫" | "施工" | "建具" | "水回り" | "家具" | "家電" | "その他";
  defaultWidth: number;
  defaultHeight: number;
  createdAt: number;
  updatedAt: number;
};

class MadorichDB extends Dexie {
  projects!: Table<Visit, string>;
  customers!: Table<Customer, string>;
  sites!: Table<Site, string>;
  customTemplates!: Table<CustomTemplate, string>;
  customChemicals!: Table<CustomChemical, string>;
  customStamps!: Table<CustomStamp, string>;
  constructor() {
    super("madorich");
    this.version(1).stores({
      projects: "id, name, updatedAt",
    });
    this.version(2).stores({
      projects: "id, name, customerId, siteId, updatedAt",
      customers: "id, name, type, updatedAt",
      sites: "id, customerId, name, updatedAt",
    });
    this.version(3).stores({
      projects: "id, name, customerId, siteId, updatedAt",
      customers: "id, name, type, updatedAt",
      sites: "id, customerId, name, updatedAt",
      customTemplates: "id, name, category, updatedAt",
      customChemicals: "id, name, target, updatedAt",
      customStamps: "id, label, category, updatedAt",
    });
  }
}

let _db: MadorichDB | null = null;
export function db(): MadorichDB {
  if (!_db) _db = new MadorichDB();
  return _db;
}

// ===== Visit (旧 Project) =====
export async function listVisits(): Promise<Visit[]> {
  return db().projects.orderBy("updatedAt").reverse().toArray();
}
export async function listVisitsBySite(siteId: string): Promise<Visit[]> {
  return db().projects
    .where("siteId")
    .equals(siteId)
    .reverse()
    .sortBy("updatedAt");
}
export async function listVisitsByCustomer(
  customerId: string,
): Promise<Visit[]> {
  return db().projects
    .where("customerId")
    .equals(customerId)
    .reverse()
    .sortBy("updatedAt");
}
export async function saveVisit(v: Visit): Promise<void> {
  const existing = await db().projects.get(v.id);
  const next: Visit = {
    ...v,
    createdAt: existing?.createdAt ?? v.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db().projects.put(next);
}
export async function loadVisit(id: string): Promise<Visit | undefined> {
  return db().projects.get(id);
}
export async function deleteVisit(id: string): Promise<void> {
  await db().projects.delete(id);
}

// ===== 後方互換エイリアス =====
export const listProjects = listVisits;
export const saveProject = (p: FloorPlan) => saveVisit(p);
export const loadProject = loadVisit;
export const deleteProject = deleteVisit;

// ===== Customer =====
export async function listCustomers(): Promise<Customer[]> {
  return db().customers.orderBy("updatedAt").reverse().toArray();
}
export async function getCustomer(id: string): Promise<Customer | undefined> {
  return db().customers.get(id);
}
export async function saveCustomer(c: Customer): Promise<void> {
  const existing = await db().customers.get(c.id);
  const next: Customer = {
    ...c,
    createdAt: existing?.createdAt ?? c.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db().customers.put(next);
}
export async function deleteCustomer(id: string): Promise<void> {
  // カスケード削除: 顧客 → 配下の sites → 配下の visits
  const sites = await db().sites.where("customerId").equals(id).toArray();
  for (const s of sites) {
    await deleteSite(s.id);
  }
  await db().customers.delete(id);
}

// ===== Site =====
export async function listSites(): Promise<Site[]> {
  return db().sites.orderBy("updatedAt").reverse().toArray();
}
export async function listSitesByCustomer(
  customerId: string,
): Promise<Site[]> {
  return db().sites
    .where("customerId")
    .equals(customerId)
    .reverse()
    .sortBy("updatedAt");
}
export async function getSite(id: string): Promise<Site | undefined> {
  return db().sites.get(id);
}
export async function saveSite(s: Site): Promise<void> {
  const existing = await db().sites.get(s.id);
  const next: Site = {
    ...s,
    createdAt: existing?.createdAt ?? s.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db().sites.put(next);
}
export async function deleteSite(id: string): Promise<void> {
  // カスケード削除: 現場 → 配下の visits
  const visits = await db().projects.where("siteId").equals(id).toArray();
  for (const v of visits) {
    await db().projects.delete(v.id);
  }
  await db().sites.delete(id);
}

// ===== Custom Templates =====
export async function listCustomTemplates(): Promise<CustomTemplate[]> {
  return db().customTemplates.orderBy("updatedAt").reverse().toArray();
}
export async function saveCustomTemplate(t: CustomTemplate): Promise<void> {
  const existing = await db().customTemplates.get(t.id);
  await db().customTemplates.put({
    ...t,
    createdAt: existing?.createdAt ?? t.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}
export async function deleteCustomTemplate(id: string): Promise<void> {
  await db().customTemplates.delete(id);
}

// ===== Custom Chemicals =====
export async function listCustomChemicals(): Promise<CustomChemical[]> {
  return db().customChemicals.orderBy("updatedAt").reverse().toArray();
}
export async function saveCustomChemical(c: CustomChemical): Promise<void> {
  const existing = await db().customChemicals.get(c.id);
  await db().customChemicals.put({
    ...c,
    createdAt: existing?.createdAt ?? c.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}
export async function deleteCustomChemical(id: string): Promise<void> {
  await db().customChemicals.delete(id);
}

// ===== Custom Stamps =====
export async function listCustomStamps(): Promise<CustomStamp[]> {
  return db().customStamps.orderBy("updatedAt").reverse().toArray();
}
export async function saveCustomStamp(s: CustomStamp): Promise<void> {
  const existing = await db().customStamps.get(s.id);
  await db().customStamps.put({
    ...s,
    createdAt: existing?.createdAt ?? s.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}
export async function deleteCustomStamp(id: string): Promise<void> {
  await db().customStamps.delete(id);
}

// ===== Full Backup =====
export async function exportAllData() {
  const [projects, customers, sites, customTemplates, customChemicals, customStamps] =
    await Promise.all([
      db().projects.toArray(),
      db().customers.toArray(),
      db().sites.toArray(),
      db().customTemplates.toArray(),
      db().customChemicals.toArray(),
      db().customStamps.toArray(),
    ]);
  return {
    version: 3,
    exportedAt: Date.now(),
    appName: "東山メンテナンス 現場マップ",
    projects,
    customers,
    sites,
    customTemplates,
    customChemicals,
    customStamps,
  };
}

export async function importAllData(
  data: Awaited<ReturnType<typeof exportAllData>>,
  mode: "replace" | "merge" = "merge",
): Promise<{ counts: Record<string, number> }> {
  if (mode === "replace") {
    await db().projects.clear();
    await db().customers.clear();
    await db().sites.clear();
    await db().customTemplates.clear();
    await db().customChemicals.clear();
    await db().customStamps.clear();
  }
  const counts: Record<string, number> = {
    projects: 0,
    customers: 0,
    sites: 0,
    customTemplates: 0,
    customChemicals: 0,
    customStamps: 0,
  };
  for (const p of data.projects ?? []) {
    await db().projects.put(p);
    counts.projects++;
  }
  for (const c of data.customers ?? []) {
    await db().customers.put(c);
    counts.customers++;
  }
  for (const s of data.sites ?? []) {
    await db().sites.put(s);
    counts.sites++;
  }
  for (const t of data.customTemplates ?? []) {
    await db().customTemplates.put(t);
    counts.customTemplates++;
  }
  for (const cc of data.customChemicals ?? []) {
    await db().customChemicals.put(cc);
    counts.customChemicals++;
  }
  for (const cs of data.customStamps ?? []) {
    await db().customStamps.put(cs);
    counts.customStamps++;
  }
  return { counts };
}
