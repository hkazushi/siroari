"use client";

import Dexie, { type Table } from "dexie";
import type { Customer, Site, Visit, FloorPlan } from "@/types";

class MadorichDB extends Dexie {
  projects!: Table<Visit, string>; // 既存名のまま（後方互換）
  customers!: Table<Customer, string>;
  sites!: Table<Site, string>;
  constructor() {
    super("madorich");
    // v1: projects のみ
    this.version(1).stores({
      projects: "id, name, updatedAt",
    });
    // v2: customers / sites 追加 + projects にインデックス追加
    this.version(2).stores({
      projects: "id, name, customerId, siteId, updatedAt",
      customers: "id, name, type, updatedAt",
      sites: "id, customerId, name, updatedAt",
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
