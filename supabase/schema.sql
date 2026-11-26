-- =====================================================================
-- 会計アプリ（東山メンテナンス）Supabase スキーマ
--   Supabase Dashboard → SQL Editor に全文を貼り付けて Run する。
--   何度実行しても壊れない（冪等）ように書いてある。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 旧アプリ（madorich / 害虫駆除 現場マップ）の後片付け
--    v1-madorich タグでコードは保存済み。データはテスト用のみだったので削除する。
-- ---------------------------------------------------------------------
drop table if exists public.visits cascade;
drop table if exists public.sites cascade;
drop table if exists public.customers cascade;
drop table if exists public.custom_templates cascade;
drop table if exists public.custom_chemicals cascade;
drop table if exists public.custom_stamps cascade;
drop table if exists public.sync_meta cascade;

-- 旧写真バケット（visit-photos）向けの匿名ポリシー
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname ilike '%visit%' or policyname ilike '%anon%' or policyname ilike '%photo%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;
-- ※ 空になった visit-photos バケット自体は Dashboard → Storage から手動削除（任意）

-- ---------------------------------------------------------------------
-- 1. 共通: updated_at 自動更新
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 2. 事業者情報（1ユーザー1行）
-- ---------------------------------------------------------------------
create table if not exists public.business_profile (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  trade_name text not null default '東山メンテナンス',
  owner_name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  invoice_number text not null default '',          -- 適格請求書発行事業者登録番号 T + 13桁
  bank_info text not null default '',               -- 請求書に載せる振込先
  tax_status text not null default 'exempt' check (tax_status in ('exempt', 'taxable')),
  tax_method text not null default 'twenty_percent' check (tax_method in ('general', 'simplified', 'twenty_percent')),
  simplified_category int not null default 5 check (simplified_category between 1 and 6),
  blue_deduction int not null default 650000 check (blue_deduction in (650000, 550000, 100000, 0)),
  opening_balances jsonb not null default '{}'::jsonb, -- { "2026": { "1110": 500000, ... } }
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_business_profile_updated on public.business_profile;
create trigger trg_business_profile_updated before update on public.business_profile
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. 取引先
-- ---------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kana text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists partners_user_idx on public.partners(user_id);

-- ---------------------------------------------------------------------
-- 4. 請求書
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number text not null,
  subject text not null default '',
  partner_id uuid references public.partners(id) on delete set null,
  partner_name text not null default '',
  partner_address text not null default '',
  issue_date date not null,
  due_date date,
  items jsonb not null default '[]'::jsonb,  -- [{description, quantity, unit, unit_price, tax_rate}]
  notes text not null default '',
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid')),
  paid_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id, issue_date);
drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. 取引（ここから複式簿記の仕訳を自動生成する）
--   kind = income  : 売上など。wallet に入金（unpaid なら売掛金）
--   kind = expense : 経費。wallet から支払（unpaid なら未払金）
--   kind = transfer: 振替。from_code（貸方）→ account_code（借方）
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense', 'transfer')),
  date date not null,
  amount bigint not null check (amount > 0),         -- 税込・円
  account_code text not null,
  from_code text,                                      -- transfer のみ
  wallet text not null default 'bank' check (wallet in ('cash', 'bank', 'card', 'owner')),
  status text not null default 'paid' check (status in ('paid', 'unpaid')),
  paid_date date,
  tax_rate int not null default 10 check (tax_rate in (0, 8, 10)),
  partner_id uuid references public.partners(id) on delete set null,
  partner_name text not null default '',
  memo text not null default '',
  receipt_path text,
  invoice_id uuid references public.invoices(id) on delete set null,
  business_ratio int not null default 100 check (business_ratio between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date);
create index if not exists transactions_invoice_idx on public.transactions(invoice_id);
drop trigger if exists trg_transactions_updated on public.transactions;
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 6. 固定資産（減価償却）
-- ---------------------------------------------------------------------
create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  account_code text not null default '1530',
  acquired_date date not null,
  cost bigint not null check (cost > 0),
  useful_life int not null default 4 check (useful_life between 1 and 50),
  method text not null default 'straight' check (method in ('straight', 'lump_sum_3y', 'small_amount')),
  business_ratio int not null default 100 check (business_ratio between 1 and 100),
  paid_from text not null default 'bank' check (paid_from in ('cash', 'bank', 'card', 'owner')),
  disposed_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fixed_assets_user_idx on public.fixed_assets(user_id);

-- ---------------------------------------------------------------------
-- 7. RLS: ログインユーザー本人の行だけ読み書きできる
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['business_profile', 'partners', 'invoices', 'transactions', 'fixed_assets']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8. 領収書画像（非公開バケット。パスは <user_id>/<ファイル名>）
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do update set public = false;

drop policy if exists "receipts own read" on storage.objects;
drop policy if exists "receipts own insert" on storage.objects;
drop policy if exists "receipts own update" on storage.objects;
drop policy if exists "receipts own delete" on storage.objects;

create policy "receipts own read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts own update" on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 9. 4桁 PIN ログインの総当たり対策（ロックアウト）
--   PIN の照合は /api/auth/pin（サーバー）で行う。ここは失敗回数とロックだけを持つ。
--   - 5 回失敗でロック。ロック時間は 15 分 → 30 分 → 1 時間 … と倍になり最長 24 時間
--   - 失敗の記録・状態確認は未ログインでも呼べる（攻撃者にできるのはロックを早めることだけ）
--   - リセットはログイン済みユーザーだけが呼べる（攻撃者がカウンタを戻せないように）
-- ---------------------------------------------------------------------
create table if not exists public.login_guard (
  id int primary key default 1 check (id = 1),
  failures int not null default 0,
  lock_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.login_guard (id) values (1) on conflict (id) do nothing;
alter table public.login_guard enable row level security; -- ポリシー無し = 直接は読み書き不可

create or replace function public.pin_guard_status()
returns timestamptz language sql security definer set search_path = public as $$
  select case when locked_until > now() then locked_until else null end from login_guard where id = 1;
$$;

create or replace function public.pin_guard_fail()
returns json language plpgsql security definer set search_path = public as $$
declare g login_guard;
begin
  select * into g from login_guard where id = 1 for update;
  if g.locked_until is not null and g.locked_until > now() then
    return json_build_object('locked_until', g.locked_until, 'remaining', 0);
  end if;
  g.failures := g.failures + 1;
  if g.failures >= 5 then
    g.locked_until := now() + least(interval '15 minutes' * power(2, g.lock_count), interval '24 hours');
    g.lock_count := g.lock_count + 1;
    g.failures := 0;
  end if;
  update login_guard set failures = g.failures, lock_count = g.lock_count, locked_until = g.locked_until, updated_at = now() where id = 1;
  return json_build_object(
    'locked_until', case when g.locked_until > now() then g.locked_until else null end,
    'remaining', case when g.locked_until > now() then 0 else 5 - g.failures end
  );
end $$;

create or replace function public.pin_guard_success()
returns void language sql security definer set search_path = public as $$
  update login_guard set failures = 0, lock_count = 0, locked_until = null, updated_at = now() where id = 1;
$$;

revoke all on function public.pin_guard_status() from public;
revoke all on function public.pin_guard_fail() from public;
revoke all on function public.pin_guard_success() from public;
grant execute on function public.pin_guard_status() to anon, authenticated;
grant execute on function public.pin_guard_fail() to anon, authenticated;
grant execute on function public.pin_guard_success() to authenticated;
