-- User image gallery for upload, crop, convert, download
create table if not exists public.user_images (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  url text not null,
  name text not null,
  size bigint default 0,
  type text,
  source text default 'upload',
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_user_images_account_id on user_images(account_id);

alter table public.user_images enable row level security;

create policy "Users can view their own images"
  on public.user_images for select
  using (is_account_member(account_id));

create policy "Users can insert their own images"
  on public.user_images for insert
  with check (is_account_member(account_id));

create policy "Users can update their own images"
  on public.user_images for update
  using (is_account_member(account_id));

create policy "Users can delete their own images"
  on public.user_images for delete
  using (is_account_member(account_id));
