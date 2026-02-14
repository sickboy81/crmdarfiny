-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts Table
create table if not exists contacts (
  id text primary key,
  name text not null,
  phone_number text not null,
  email text,
  avatar text,
  status text default 'active',
  tags text[] default '{}',
  pipeline_stage text default 'lead',
  last_seen timestamp with time zone,
  unread_count integer default 0,
  is_lead boolean default false,
  source text,
  property_interest text,
  real_estate_preferences jsonb default '{}',
  deal_value numeric,
  notes text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists contacts_phone_number_idx on contacts(phone_number);
create index if not exists contacts_pipeline_stage_idx on contacts(pipeline_stage);

-- Properties Table
create table if not exists properties (
  id text primary key,
  code text,
  title text not null,
  description text,
  type text,
  status text default 'available',
  price numeric,
  zip_code text,
  address text,
  neighborhood text,
  city text,
  specs jsonb,
  features text[] default '{}',
  photos text[] default '{}',
  owner_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists properties_code_idx on properties(code);
create index if not exists properties_type_idx on properties(type);
create index if not exists properties_status_idx on properties(status);

-- Campaigns Table
create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text not null,
  created_at timestamp with time zone default now(),
  scheduled_for timestamp with time zone,
  template_name text,
  stats jsonb default '{"total": 0, "sent": 0, "success": 0, "failed": 0}',
  audience_snapshot jsonb
);

-- Campaign Logs Table
create table if not exists campaign_logs (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id text references contacts(id),
  contact_name text,
  contact_phone text,
  status text,
  sent_at timestamp with time zone,
  error text,
  created_at timestamp with time zone default now()
);

-- Messages Table
create table if not exists messages (
  id text primary key,
  contact_id text references contacts(id),
  text text,
  sender text,
  timestamp timestamp with time zone default now(),
  status text,
  type text default 'text'
);

create index if not exists messages_contact_id_idx on messages(contact_id);

-- Profiles Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default now()
);

-- Settings Table
create table if not exists settings (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}',
  updated_at timestamp with time zone default now()
);

-- Social Posts Table
create table if not exists social_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade,
  original_idea text not null,
  platform text not null,
  content text not null,
  hashtags text[],
  media_urls text[],
  created_at timestamp with time zone default now()
);

-- Bio Configs Table (Standalone for Public Access)
create table if not exists bio_configs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade unique,
  profile_name text,
  bio text,
  avatar_url text,
  theme jsonb,
  links jsonb,
  socials jsonb,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS Enablement
alter table contacts enable row level security;
alter table campaigns enable row level security;
alter table campaign_logs enable row level security;
alter table properties enable row level security;
alter table messages enable row level security;
alter table profiles enable row level security;
alter table settings enable row level security;
alter table social_posts enable row level security;
alter table bio_configs enable row level security;

-- DROP AND RECREATE POLICIES (Idempotent)
drop policy if exists "Allow public access for now" on contacts;
create policy "Allow public access for now" on contacts for all using (true);

drop policy if exists "Allow public access for now" on campaigns;
create policy "Allow public access for now" on campaigns for all using (true);

drop policy if exists "Allow public access for now" on campaign_logs;
create policy "Allow public access for now" on campaign_logs for all using (true);

drop policy if exists "Allow public access for now" on properties;
create policy "Allow public access for now" on properties for all using (true);

drop policy if exists "Allow public access for now" on messages;
create policy "Allow public access for now" on messages for all using (true);

drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles for select using (true);

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

drop policy if exists "Users can manage their own settings." on settings;
create policy "Users can manage their own settings." on settings for all using (auth.uid() = user_id);

drop policy if exists "Users can manage their own social posts." on social_posts;
create policy "Users can manage their own social posts." on social_posts for all using (auth.uid() = user_id);

drop policy if exists "Bio configs are publicly viewable" on bio_configs;
create policy "Bio configs are publicly viewable" on bio_configs for select using (true);

drop policy if exists "Users can manage their own bio configs" on bio_configs;
create policy "Users can manage their own bio configs" on bio_configs for all using (auth.uid() = user_id);

-- TRIGGERS & FUNCTIONS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id, 
    new.email, 
    case 
      when new.email = 'consultoradarfiny@gmail.com' then 'admin' 
      else 'user' 
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace trigger update_settings_updated_at
    before update on settings
    for each row execute procedure update_updated_at_column();

-- STORAGE BUCKETS
-- Note: inserting into storage.buckets requires appropriate permissions
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bio-assets', 'bio-assets', true)
on conflict (id) do nothing;

-- Storage Policies
-- Allow public access to read avatars
drop policy if exists "Public Access Avatars" on storage.objects;
create policy "Public Access Avatars" on storage.objects for select using (bucket_id = 'avatars');

-- Allow public access to read bio-assets
drop policy if exists "Public Access Bio Assets" on storage.objects;
create policy "Public Access Bio Assets" on storage.objects for select using (bucket_id = 'bio-assets');

-- Allow authenticated users to upload avatars
drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars');

-- Allow authenticated users to upload bio-assets
drop policy if exists "Authenticated users can upload bio-assets" on storage.objects;
create policy "Authenticated users can upload bio-assets" on storage.objects for insert with check (bucket_id = 'bio-assets');

-- Allow authenticated users to update bio-assets (for re-uploading)
drop policy if exists "Authenticated users can update bio-assets" on storage.objects;
create policy "Authenticated users can update bio-assets" on storage.objects for update with check (bucket_id = 'bio-assets');

-- Allow authenticated users to delete own
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects for delete using (bucket_id = 'avatars');

