-- ============================================================
-- dub — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor)
-- ============================================================

-- 1. Doodles table
-- Holds every doodle uploaded to the Community gallery, and every
-- doodle submitted through the "dub" brand-generation tool.
create table if not exists doodles (
  id            uuid primary key default gen_random_uuid(),
  creator_name  text not null default 'anonymous',
  image_url     text not null,              -- public URL in Supabase Storage
  category      text not null default 'organic'
                  check (category in ('patterns','lines','shapes','organic','abstract','symbols')),
  source        text not null default 'community'
                  check (source in ('community','dub_tool')),
  created_at    timestamptz not null default now()
);

-- Fast lookups for the gallery (filter by category, sort by newest)
create index if not exists doodles_category_idx on doodles (category);
create index if not exists doodles_created_at_idx on doodles (created_at desc);

-- 2. Row Level Security
-- Anyone can read (public gallery). Anyone can insert (public upload).
-- Tighten the insert policy later if you add auth / rate limiting.
alter table doodles enable row level security;

create policy "Public read access"
  on doodles for select
  using (true);

create policy "Public insert access"
  on doodles for insert
  with check (true);

-- 3. Storage bucket for doodle images
-- Create this in the Supabase dashboard under Storage, or via SQL:
insert into storage.buckets (id, name, public)
values ('doodles', 'doodles', true)
on conflict (id) do nothing;

-- Intentionally NO select/list policy here.
-- The bucket is public, so individual files are downloadable via their
-- direct URL (which the app stores in the `doodles` table) without any
-- RLS policy needed. A select policy on storage.objects would additionally
-- let anyone call storage.from('doodles').list() and enumerate every file
-- in the bucket -- which the app never needs and shouldn't expose.

create policy "Public upload doodle images"
  on storage.objects for insert
  with check (bucket_id = 'doodles');
