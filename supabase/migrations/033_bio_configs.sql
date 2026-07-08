-- Bio link page configuration
create table if not exists public.bio_configs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade unique,
  profile_name text,
  bio text,
  avatar_url text,
  og_title text,
  og_description text,
  og_image_url text,
  theme jsonb default '{"backgroundColor": "#0F172A", "buttonColor": "#25D366", "textColor": "#FFFFFF", "buttonTextColor": "#000000", "fontFamily": "sans-serif", "cardStyle": "rounded"}'::jsonb,
  links jsonb default '[]'::jsonb,
  socials jsonb default '{}'::jsonb,
  active boolean default true,
  updated_at timestamptz default now()
);

create index if not exists idx_bio_configs_account_id on bio_configs(account_id);

alter table public.bio_configs enable row level security;

create policy "Users can view their own bio config"
  on public.bio_configs for select
  using (is_account_member(account_id));

create policy "Users can insert their own bio config"
  on public.bio_configs for insert
  with check (is_account_member(account_id, 'admin'));

create policy "Users can update their own bio config"
  on public.bio_configs for update
  using (is_account_member(account_id, 'admin'));

create policy "Users can delete their own bio config"
  on public.bio_configs for delete
  using (is_account_member(account_id, 'admin'));

-- Public access for active bio pages (for the public /bio route)
create policy "Public can view active bio configs"
  on public.bio_configs for select
  using (active = true);
