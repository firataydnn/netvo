-- ============================================================================
--  NETVO BACKEND — Supabase (Postgres) şeması   ·  Faz 2: Pro tier gelir kilidi
--  Kurulum: Supabase SQL Editor'a yapıştır ve çalıştır.
--  RLS (Row Level Security) açık: her kullanıcı yalnız kendi verisine erişir.
-- ============================================================================

-- Kullanıcı profili (auth.users'ı genişletir)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  tier        text not null default 'free' check (tier in ('free','pro','b2b')),
  locale      text default 'tr',
  created_at  timestamptz default now()
);

-- Takip listesi (pazaryeri + kategori). Free tier'da sınırlı (uygulama kontrol eder).
create table if not exists watches (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  mk          text not null,                 -- pazaryeri key (ör. 'trendyol')
  cat         text not null default 'genel', -- NORM kategori anahtarı
  last_rate   numeric,                       -- son bilinen oran (değişiklik tespiti için)
  created_at  timestamptz default now(),
  unique (user_id, mk, cat)
);

-- Abonelik (Stripe/iyzico). Webhook günceller.
create table if not exists subscriptions (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null default 'stripe',   -- 'stripe' | 'iyzico'
  provider_sub_id    text,
  status             text not null default 'inactive',  -- active | past_due | canceled | inactive
  current_period_end timestamptz,
  updated_at         timestamptz default now(),
  unique (user_id)
);

-- E-posta bülteni (Pro dışı da toplanır)
create table if not exists email_leads (
  email       text primary key,
  source      text default 'site',
  locale      text default 'tr',
  created_at  timestamptz default now()
);

-- Ücret değişiklik geçmişi (uyarı motoru + audit)
create table if not exists rate_changes (
  id          bigint generated always as identity primary key,
  mk          text not null,
  cat         text not null,
  old_rate    numeric,
  new_rate    numeric,
  source      text,
  detected_at timestamptz default now()
);

-- ---- RLS ----
alter table profiles       enable row level security;
alter table watches        enable row level security;
alter table subscriptions  enable row level security;

create policy "own profile"      on profiles      for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own watches"      on watches       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own subscription" on subscriptions for select using (auth.uid() = user_id);
-- subscriptions'ı yalnız service_role (webhook) yazar; email_leads/rate_changes service_role.

-- Yeni kullanıcıda otomatik profil
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
