-- ============================================================================
--  NETVO — Bulut senkron şeması (hesap + ürün portföyü)
--  Kurulum: Supabase → SQL Editor → yapıştır → Run.
--  RLS açık: her kullanıcı yalnız kendi verisine erişir.
-- ============================================================================

-- 1) Profil (auth.users'ı genişletir)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  tier        text not null default 'free' check (tier in ('free','pro','b2b')),
  locale      text default 'tr',
  created_at  timestamptz default now()
);

-- 2) Kayıtlı ürünler (kullanıcının kâr portföyü) — siteideki SAVES ile birebir
create table if not exists saves (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  local_id    text,                 -- tarayıcıdaki yerel kaydın id'si (dedup için)
  name        text,                 -- ürün adı
  mk          text,                 -- pazaryeri key
  country     text,                 -- ülke kodu
  cat         text,                 -- kategori
  cur         text,                 -- para birimi simgesi
  price       numeric,              -- satış fiyatı
  cost        numeric,              -- ürün maliyeti
  net         numeric,              -- sana kalan
  marj        numeric,              -- marj %
  meta        jsonb,                -- ek alanlar (kargo, reklam, iade vb.)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, local_id)
);

-- 3) E-posta bülteni
create table if not exists email_leads (
  email       text primary key,
  source      text default 'site',
  locale      text default 'tr',
  created_at  timestamptz default now()
);

-- ---- RLS ----
alter table profiles enable row level security;
alter table saves    enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own saves" on saves;
create policy "own saves" on saves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Yeni kullanıcıda otomatik profil ----
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
