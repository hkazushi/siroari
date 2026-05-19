-- ============================================================================
-- 東山メンテナンス 害虫駆除 現場マップ — Supabase スキーマ
-- このファイルを Supabase Dashboard → SQL Editor に貼り付けて Run してください。
-- ============================================================================

-- ---- 必要な拡張 ----
create extension if not exists "pgcrypto";

-- ---- 顧客 ----
create table if not exists public.customers (
  id            text primary key,
  name          text not null,
  kana          text,
  type          text not null check (type in ('residential', 'commercial')),
  address       text,
  contact_person text,
  contact_phone text,
  contact_email text,
  contract_type text check (contract_type in ('spot', 'monthly', 'quarterly', 'annual')),
  notes         text,
  created_at    bigint not null,
  updated_at    bigint not null
);
create index if not exists customers_updated_idx on public.customers (updated_at desc);

-- ---- 現場 ----
create table if not exists public.sites (
  id            text primary key,
  customer_id   text not null references public.customers(id) on delete cascade,
  name          text not null,
  address       text,
  building_type text,
  floor_area    numeric,
  notes         text,
  created_at    bigint not null,
  updated_at    bigint not null
);
create index if not exists sites_customer_idx on public.sites (customer_id);
create index if not exists sites_updated_idx on public.sites (updated_at desc);

-- ---- 訪問（旧 projects = Visit） ----
create table if not exists public.visits (
  id                  text primary key,
  name                text not null,
  customer_id         text references public.customers(id) on delete set null,
  site_id             text references public.sites(id) on delete set null,
  visit_number        integer,
  visit_date          bigint,
  next_visit_date     bigint,
  technician_name     text,
  technician_license  text,
  general_notes       text,
  -- JSON フィールドで複雑データを保持（IndexedDB と互換）
  elements            jsonb not null default '[]'::jsonb,
  chemicals           jsonb not null default '[]'::jsonb,
  paper_size          jsonb not null default '{"width":14560,"height":10920}'::jsonb,
  grid_size           integer not null default 910,
  customer_signature  text,  -- base64 data URL
  technician_signature text, -- base64 data URL
  is_public           boolean not null default false, -- 公開リンク用フラグ
  public_slug         text unique, -- 公開リンク用 URL の slug
  created_at          bigint not null,
  updated_at          bigint not null
);
create index if not exists visits_site_idx on public.visits (site_id, updated_at desc);
create index if not exists visits_customer_idx on public.visits (customer_id, updated_at desc);
create index if not exists visits_updated_idx on public.visits (updated_at desc);
create index if not exists visits_public_slug_idx on public.visits (public_slug) where public_slug is not null;

-- ---- カスタムテンプレ ----
create table if not exists public.custom_templates (
  id          text primary key,
  name        text not null,
  description text,
  category    text not null,
  elements    jsonb not null default '[]'::jsonb,
  created_at  bigint not null,
  updated_at  bigint not null
);
create index if not exists custom_templates_updated_idx on public.custom_templates (updated_at desc);

-- ---- カスタム薬剤プリセット ----
create table if not exists public.custom_chemicals (
  id                text primary key,
  name              text not null,
  active_ingredient text,
  unit              text not null,
  default_dilution  text,
  target            text,
  manufacturer      text,
  created_at        bigint not null,
  updated_at        bigint not null
);
create index if not exists custom_chemicals_updated_idx on public.custom_chemicals (updated_at desc);

-- ---- 同期メタ情報（最終同期時刻など）----
create table if not exists public.sync_meta (
  id          text primary key default 'singleton',
  last_synced bigint
);
insert into public.sync_meta (id, last_synced) values ('singleton', 0)
on conflict do nothing;

-- ============================================================================
-- RLS（行レベルセキュリティ）
-- 単一企業利用のため、anon ロールに全権限を許可します。
-- 複数スタッフでスタッフごとに権限を分けたい場合は、
-- 後で auth を導入し、ここのポリシーを差し替えてください。
-- ============================================================================

-- まず RLS を有効化
alter table public.customers        enable row level security;
alter table public.sites            enable row level security;
alter table public.visits           enable row level security;
alter table public.custom_templates enable row level security;
alter table public.custom_chemicals enable row level security;
alter table public.sync_meta        enable row level security;

-- anon にフルアクセス（後で auth を導入する際にこれらは drop してください）
do $$ begin
  drop policy if exists "anon all customers"        on public.customers;
  drop policy if exists "anon all sites"            on public.sites;
  drop policy if exists "anon all visits"           on public.visits;
  drop policy if exists "anon read public visits"   on public.visits;
  drop policy if exists "anon all custom_templates" on public.custom_templates;
  drop policy if exists "anon all custom_chemicals" on public.custom_chemicals;
  drop policy if exists "anon all sync_meta"        on public.sync_meta;
end $$;

create policy "anon all customers"        on public.customers        for all to anon using (true) with check (true);
create policy "anon all sites"            on public.sites            for all to anon using (true) with check (true);
create policy "anon all visits"           on public.visits           for all to anon using (true) with check (true);
create policy "anon all custom_templates" on public.custom_templates for all to anon using (true) with check (true);
create policy "anon all custom_chemicals" on public.custom_chemicals for all to anon using (true) with check (true);
create policy "anon all sync_meta"        on public.sync_meta        for all to anon using (true) with check (true);

-- ============================================================================
-- Storage バケット（写真用）
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('visit-photos', 'visit-photos', true)
on conflict (id) do nothing;

-- 公開バケットへの anon 書き込み許可
do $$ begin
  drop policy if exists "anon upload visit-photos" on storage.objects;
  drop policy if exists "anon read visit-photos"   on storage.objects;
  drop policy if exists "anon update visit-photos" on storage.objects;
  drop policy if exists "anon delete visit-photos" on storage.objects;
end $$;

create policy "anon upload visit-photos" on storage.objects
  for insert to anon
  with check (bucket_id = 'visit-photos');

create policy "anon read visit-photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'visit-photos');

create policy "anon update visit-photos" on storage.objects
  for update to anon
  using (bucket_id = 'visit-photos');

create policy "anon delete visit-photos" on storage.objects
  for delete to anon
  using (bucket_id = 'visit-photos');
