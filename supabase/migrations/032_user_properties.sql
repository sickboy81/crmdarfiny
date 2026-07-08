-- Property catalog for real estate listings
create table if not exists public.user_properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  code text,
  title text not null,
  description text,
  type text default 'apartment',
  status text default 'available',
  price numeric default 0,
  address text,
  neighborhood text,
  city text,
  specs jsonb default '{}',
  features text[] default '{}',
  photos text[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_user_properties_account_id on user_properties(account_id);

alter table public.user_properties enable row level security;

create policy "Users can view their own properties"
  on public.user_properties for select
  using (is_account_member(account_id));

create policy "Users can insert their own properties"
  on public.user_properties for insert
  with check (is_account_member(account_id));

create policy "Users can update their own properties"
  on public.user_properties for update
  using (is_account_member(account_id));

create policy "Users can delete their own properties"
  on public.user_properties for delete
  using (is_account_member(account_id));
