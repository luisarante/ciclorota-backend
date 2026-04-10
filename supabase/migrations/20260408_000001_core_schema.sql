create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text null,
  avatar_url text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_length_check check (full_name is null or char_length(full_name) <= 120)
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  name text not null,
  description text not null,
  qr_code text not null,
  latitude double precision not null,
  longitude double precision not null,
  "order" integer not null,
  map text null,
  constraint checkpoints_qr_code_unique unique (qr_code),
  constraint checkpoints_order_unique unique ("order"),
  constraint checkpoints_order_positive_check check ("order" > 0),
  constraint checkpoints_latitude_range_check check (latitude between -90 and 90),
  constraint checkpoints_longitude_range_check check (longitude between -180 and 180)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkpoint_id uuid not null references public.checkpoints (id) on delete cascade,
  scanned_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint checkins_user_checkpoint_unique unique (user_id, checkpoint_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issued_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint certificates_user_unique unique (user_id)
);

create index if not exists idx_profiles_updated_at on public.profiles (updated_at desc);
create index if not exists idx_checkpoints_order on public.checkpoints ("order" asc);
create index if not exists idx_checkins_user_id_scanned_at on public.checkins (user_id, scanned_at desc);
create index if not exists idx_checkins_checkpoint_id_scanned_at on public.checkins (checkpoint_id, scanned_at desc);
create index if not exists idx_checkins_scanned_at on public.checkins (scanned_at desc);
create index if not exists idx_certificates_issued_at on public.certificates (issued_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_checkpoints_updated_at on public.checkpoints;
create trigger set_checkpoints_updated_at
before update on public.checkpoints
for each row
execute function public.set_current_timestamp_updated_at();

comment on table public.profiles is 'Perfil canônico do usuário autenticado no Supabase.';
comment on table public.checkpoints is 'Pontos oficiais da rota, ordenados e identificados por qr_code único.';
comment on table public.checkins is 'Registro definitivo de visita por usuário e checkpoint. A API assume unicidade por checkpoint.';
comment on table public.certificates is 'Certificado emitido uma única vez por usuário elegível.';
