"use client";

import { supabase, isCloudConfigured } from "@/lib/supabase";
import {
  db,
  type CustomTemplate,
  type CustomChemical,
} from "@/lib/db";
import type {
  Customer,
  Site,
  Visit,
  AnyElement,
  ChemicalUse,
} from "@/types";

// ============================================================================
// Row 型（snake_case の DB スキーマ）
// ============================================================================

type CustomerRow = {
  id: string;
  name: string;
  kana: string | null;
  type: "residential" | "commercial";
  address: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contract_type: Customer["contractType"] | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

type SiteRow = {
  id: string;
  customer_id: string;
  name: string;
  address: string | null;
  building_type: string | null;
  floor_area: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

type VisitRow = {
  id: string;
  name: string;
  customer_id: string | null;
  site_id: string | null;
  visit_number: number | null;
  visit_date: number | null;
  next_visit_date: number | null;
  technician_name: string | null;
  technician_license: string | null;
  general_notes: string | null;
  elements: AnyElement[];
  chemicals: ChemicalUse[];
  paper_size: { width: number; height: number };
  grid_size: number;
  customer_signature: string | null;
  technician_signature: string | null;
  is_public: boolean;
  public_slug: string | null;
  created_at: number;
  updated_at: number;
};

type CustomTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  elements: AnyElement[];
  created_at: number;
  updated_at: number;
};

type CustomChemicalRow = {
  id: string;
  name: string;
  active_ingredient: string | null;
  unit: ChemicalUse["unit"];
  default_dilution: string | null;
  target: string | null;
  manufacturer: string | null;
  created_at: number;
  updated_at: number;
};

// ============================================================================
// 変換: camelCase ↔ snake_case
// ============================================================================

const toCustomerRow = (c: Customer): CustomerRow => ({
  id: c.id,
  name: c.name,
  kana: c.kana ?? null,
  type: c.type,
  address: c.address ?? null,
  contact_person: c.contactPerson ?? null,
  contact_phone: c.contactPhone ?? null,
  contact_email: c.contactEmail ?? null,
  contract_type: c.contractType ?? null,
  notes: c.notes ?? null,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

const fromCustomerRow = (r: CustomerRow): Customer => ({
  id: r.id,
  name: r.name,
  kana: r.kana ?? undefined,
  type: r.type,
  address: r.address ?? undefined,
  contactPerson: r.contact_person ?? undefined,
  contactPhone: r.contact_phone ?? undefined,
  contactEmail: r.contact_email ?? undefined,
  contractType: r.contract_type ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toSiteRow = (s: Site): SiteRow => ({
  id: s.id,
  customer_id: s.customerId,
  name: s.name,
  address: s.address ?? null,
  building_type: s.buildingType ?? null,
  floor_area: s.floorArea ?? null,
  notes: s.notes ?? null,
  created_at: s.createdAt,
  updated_at: s.updatedAt,
});

const fromSiteRow = (r: SiteRow): Site => ({
  id: r.id,
  customerId: r.customer_id,
  name: r.name,
  address: r.address ?? undefined,
  buildingType: r.building_type ?? undefined,
  floorArea: r.floor_area ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toVisitRow = (v: Visit): VisitRow => ({
  id: v.id,
  name: v.name,
  customer_id: v.customerId ?? null,
  site_id: v.siteId ?? null,
  visit_number: v.visitNumber ?? null,
  visit_date: v.visitDate ?? null,
  next_visit_date: v.nextVisitDate ?? null,
  technician_name: v.technicianName ?? null,
  technician_license: v.technicianLicense ?? null,
  general_notes: v.generalNotes ?? null,
  elements: v.elements,
  chemicals: v.chemicals ?? [],
  paper_size: v.paperSize,
  grid_size: v.gridSize,
  customer_signature: v.customerSignature ?? null,
  technician_signature: v.technicianSignature ?? null,
  is_public: false,
  public_slug: null,
  created_at: v.createdAt,
  updated_at: v.updatedAt,
});

const fromVisitRow = (r: VisitRow): Visit => ({
  id: r.id,
  name: r.name,
  customerId: r.customer_id ?? undefined,
  siteId: r.site_id ?? undefined,
  visitNumber: r.visit_number ?? undefined,
  visitDate: r.visit_date ?? undefined,
  nextVisitDate: r.next_visit_date ?? undefined,
  technicianName: r.technician_name ?? undefined,
  technicianLicense: r.technician_license ?? undefined,
  generalNotes: r.general_notes ?? undefined,
  elements: r.elements ?? [],
  chemicals: r.chemicals ?? [],
  paperSize: r.paper_size,
  gridSize: r.grid_size,
  customerSignature: r.customer_signature ?? undefined,
  technicianSignature: r.technician_signature ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toCustomTemplateRow = (t: CustomTemplate): CustomTemplateRow => ({
  id: t.id,
  name: t.name,
  description: t.description ?? null,
  category: t.category,
  elements: t.elements,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

const fromCustomTemplateRow = (r: CustomTemplateRow): CustomTemplate => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  category: r.category,
  elements: r.elements ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toCustomChemicalRow = (c: CustomChemical): CustomChemicalRow => ({
  id: c.id,
  name: c.name,
  active_ingredient: c.activeIngredient ?? null,
  unit: c.unit,
  default_dilution: c.defaultDilution ?? null,
  target: c.target ?? null,
  manufacturer: c.manufacturer ?? null,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
});

const fromCustomChemicalRow = (r: CustomChemicalRow): CustomChemical => ({
  id: r.id,
  name: r.name,
  activeIngredient: r.active_ingredient ?? undefined,
  unit: r.unit,
  defaultDilution: r.default_dilution ?? undefined,
  target: r.target ?? undefined,
  manufacturer: r.manufacturer ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ============================================================================
// 同期処理
// ============================================================================

export type SyncResult = {
  uploaded: Record<string, number>;
  downloaded: Record<string, number>;
  durationMs: number;
};

/**
 * ローカル IndexedDB の全データを Supabase にアップロード（upsert）。
 * - 同じ id の場合は updated_at が新しい方を保持
 */
export async function pushAllToCloud(): Promise<Record<string, number>> {
  const sb = supabase();
  const counts: Record<string, number> = {};

  const customers = await db().customers.toArray();
  if (customers.length > 0) {
    const { error } = await sb
      .from("customers")
      .upsert(customers.map(toCustomerRow), { onConflict: "id" });
    if (error) throw new Error(`customers: ${error.message}`);
  }
  counts.customers = customers.length;

  const sites = await db().sites.toArray();
  if (sites.length > 0) {
    const { error } = await sb
      .from("sites")
      .upsert(sites.map(toSiteRow), { onConflict: "id" });
    if (error) throw new Error(`sites: ${error.message}`);
  }
  counts.sites = sites.length;

  const visits = await db().projects.toArray();
  if (visits.length > 0) {
    const { error } = await sb
      .from("visits")
      .upsert(visits.map(toVisitRow), { onConflict: "id" });
    if (error) throw new Error(`visits: ${error.message}`);
  }
  counts.visits = visits.length;

  const tpls = await db().customTemplates.toArray();
  if (tpls.length > 0) {
    const { error } = await sb
      .from("custom_templates")
      .upsert(tpls.map(toCustomTemplateRow), { onConflict: "id" });
    if (error) throw new Error(`custom_templates: ${error.message}`);
  }
  counts.customTemplates = tpls.length;

  const chems = await db().customChemicals.toArray();
  if (chems.length > 0) {
    const { error } = await sb
      .from("custom_chemicals")
      .upsert(chems.map(toCustomChemicalRow), { onConflict: "id" });
    if (error) throw new Error(`custom_chemicals: ${error.message}`);
  }
  counts.customChemicals = chems.length;

  return counts;
}

/**
 * Supabase の全データを IndexedDB にダウンロード。
 * - 既存ローカルデータと比較し、updated_at が新しい方を残す
 */
export async function pullAllFromCloud(): Promise<Record<string, number>> {
  const sb = supabase();
  const counts: Record<string, number> = {
    customers: 0,
    sites: 0,
    visits: 0,
    customTemplates: 0,
    customChemicals: 0,
  };

  // customers
  {
    const { data, error } = await sb.from("customers").select("*");
    if (error) throw new Error(`customers: ${error.message}`);
    for (const r of (data ?? []) as CustomerRow[]) {
      const local = await db().customers.get(r.id);
      if (!local || (local.updatedAt ?? 0) < r.updated_at) {
        await db().customers.put(fromCustomerRow(r));
        counts.customers++;
      }
    }
  }

  // sites
  {
    const { data, error } = await sb.from("sites").select("*");
    if (error) throw new Error(`sites: ${error.message}`);
    for (const r of (data ?? []) as SiteRow[]) {
      const local = await db().sites.get(r.id);
      if (!local || (local.updatedAt ?? 0) < r.updated_at) {
        await db().sites.put(fromSiteRow(r));
        counts.sites++;
      }
    }
  }

  // visits
  {
    const { data, error } = await sb.from("visits").select("*");
    if (error) throw new Error(`visits: ${error.message}`);
    for (const r of (data ?? []) as VisitRow[]) {
      const local = await db().projects.get(r.id);
      if (!local || (local.updatedAt ?? 0) < r.updated_at) {
        await db().projects.put(fromVisitRow(r));
        counts.visits++;
      }
    }
  }

  // custom_templates
  {
    const { data, error } = await sb.from("custom_templates").select("*");
    if (error) throw new Error(`custom_templates: ${error.message}`);
    for (const r of (data ?? []) as CustomTemplateRow[]) {
      const local = await db().customTemplates.get(r.id);
      if (!local || (local.updatedAt ?? 0) < r.updated_at) {
        await db().customTemplates.put(fromCustomTemplateRow(r));
        counts.customTemplates++;
      }
    }
  }

  // custom_chemicals
  {
    const { data, error } = await sb.from("custom_chemicals").select("*");
    if (error) throw new Error(`custom_chemicals: ${error.message}`);
    for (const r of (data ?? []) as CustomChemicalRow[]) {
      const local = await db().customChemicals.get(r.id);
      if (!local || (local.updatedAt ?? 0) < r.updated_at) {
        await db().customChemicals.put(fromCustomChemicalRow(r));
        counts.customChemicals++;
      }
    }
  }

  return counts;
}

/** Push + Pull の双方向同期 */
export async function syncBoth(): Promise<SyncResult> {
  if (!isCloudConfigured()) {
    throw new Error("クラウドが未設定です");
  }
  const start = Date.now();
  const uploaded = await pushAllToCloud();
  const downloaded = await pullAllFromCloud();
  return { uploaded, downloaded, durationMs: Date.now() - start };
}

// ============================================================================
// 個別保存（オンライン中は自動でクラウドに反映、オフラインは IndexedDB のみ）
// ============================================================================

export async function cloudSaveVisit(v: Visit): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    const sb = supabase();
    const { error } = await sb
      .from("visits")
      .upsert(toVisitRow(v), { onConflict: "id" });
    if (error) console.warn("cloud visit save failed:", error.message);
  } catch (e) {
    console.warn("cloud visit save threw:", e);
  }
}

export async function cloudSaveCustomer(c: Customer): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    const sb = supabase();
    const { error } = await sb
      .from("customers")
      .upsert(toCustomerRow(c), { onConflict: "id" });
    if (error) console.warn("cloud customer save failed:", error.message);
  } catch (e) {
    console.warn("cloud customer save threw:", e);
  }
}

export async function cloudSaveSite(s: Site): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    const sb = supabase();
    const { error } = await sb
      .from("sites")
      .upsert(toSiteRow(s), { onConflict: "id" });
    if (error) console.warn("cloud site save failed:", error.message);
  } catch (e) {
    console.warn("cloud site save threw:", e);
  }
}

export async function cloudDeleteVisit(id: string): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    await supabase().from("visits").delete().eq("id", id);
  } catch {}
}
export async function cloudDeleteCustomer(id: string): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    await supabase().from("customers").delete().eq("id", id);
  } catch {}
}
export async function cloudDeleteSite(id: string): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    await supabase().from("sites").delete().eq("id", id);
  } catch {}
}

// ============================================================================
// 公開リンク（お客様用 read-only URL）
// ============================================================================

/** 訪問を公開状態にし、公開 slug を返す */
export async function publishVisit(visitId: string): Promise<string> {
  if (!isCloudConfigured()) {
    throw new Error("クラウド未設定のため公開リンクは作成できません");
  }
  const slug = await generateSlug();
  const sb = supabase();
  const { error } = await sb
    .from("visits")
    .update({ is_public: true, public_slug: slug })
    .eq("id", visitId);
  if (error) throw new Error(error.message);
  return slug;
}

export async function unpublishVisit(visitId: string): Promise<void> {
  if (!isCloudConfigured()) return;
  const sb = supabase();
  await sb
    .from("visits")
    .update({ is_public: false, public_slug: null })
    .eq("id", visitId);
}

export async function getPublicVisit(
  slug: string,
): Promise<{ visit: Visit; customer?: Customer; site?: Site } | null> {
  if (!isCloudConfigured()) return null;
  const sb = supabase();
  const { data, error } = await sb
    .from("visits")
    .select("*")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as VisitRow;
  const visit = fromVisitRow(row);
  let customer: Customer | undefined;
  let site: Site | undefined;
  if (row.customer_id) {
    const { data: cd } = await sb
      .from("customers")
      .select("*")
      .eq("id", row.customer_id)
      .maybeSingle();
    if (cd) customer = fromCustomerRow(cd as CustomerRow);
  }
  if (row.site_id) {
    const { data: sd } = await sb
      .from("sites")
      .select("*")
      .eq("id", row.site_id)
      .maybeSingle();
    if (sd) site = fromSiteRow(sd as SiteRow);
  }
  return { visit, customer, site };
}

async function generateSlug(): Promise<string> {
  // ランダム 12 文字（衝突したらリトライ）
  const sb = supabase();
  for (let i = 0; i < 5; i++) {
    const slug = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36])
      .join("");
    const { data } = await sb
      .from("visits")
      .select("id")
      .eq("public_slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  throw new Error("slug 生成に失敗しました");
}
