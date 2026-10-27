-- Script SQL para Supabase (Tabla products con Row Level Security y Borrado Lógico)
-- Ejecutar en el SQL Editor del proyecto en Supabase

create table if not exists public.products (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id uuid not null unique,
  name text not null,
  quantity integer not null check (quantity >= 0),
  price integer not null check (price >= 0),
  updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz default null
);

-- Si la tabla ya fue creada previamente sin deleted_at:
alter table public.products add column if not exists deleted_at timestamptz default null;

alter table public.products enable row level security;

-- Políticas de seguridad RLS: Cada usuario solo interactúa con sus propios registros
create policy "ver los míos" on public.products
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "crear los míos" on public.products
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "editar los míos" on public.products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "borrar los míos" on public.products
  for delete to authenticated using ((select auth.uid()) = user_id);
