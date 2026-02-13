-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Contacts Table
create table if not exists contacts (
  id text primary key, -- keeping text to support existing IDs like 'msg_123', but uuid is better for new ones
  name text not null,
  phone_number text not null,
  email text,
  avatar text,
  status text default 'active',
  tags text[] default '{}',
  pipeline_stage text default 'lead',
  last_seen timestamp with time zone,
  unread_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for faster search
create index if not exists contacts_phone_number_idx on contacts(phone_number);
create index if not exists contacts_pipeline_stage_idx on contacts(pipeline_stage);

-- Properties Table (Real Estate)
create table if not exists properties (
  id text primary key, -- changed to text to support 'prop-1' mock IDs
  code text,
  title text not null,
  description text,
  type text, -- 'apartment', 'house', 'land', 'commercial', 'village_house', 'studio'
  status text default 'available', -- 'available', 'reserved', 'sold', 'rented'
  price numeric,
  zip_code text,
  address text,
  neighborhood text,
  city text,
  specs jsonb, -- { area: 0, bedrooms: 0, bathrooms: 0, parking: 0 }
  features text[] default '{}',
  photos text[] default '{}',
  owner_id uuid references profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for property search
create index if not exists properties_code_idx on properties(code);
create index if not exists properties_type_idx on properties(type);
create index if not exists properties_status_idx on properties(status);

-- Campaigns Table
create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text not null, -- 'draft', 'scheduled', 'running', 'completed', 'paused'
  created_at timestamp with time zone default now(),
  scheduled_for timestamp with time zone,
  template_name text,
  stats jsonb default '{"total": 0, "sent": 0, "success": 0, "failed": 0}',
  audience_snapshot jsonb -- { tags: [], pipelineStage: '', count: 0 }
);

-- Campaign Logs Table
create table if not exists campaign_logs (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id text references contacts(id), -- text because contact.id is text
  contact_name text,
  contact_phone text,
  status text, -- 'pending', 'sent', 'failed'
  sent_at timestamp with time zone,
  error text,
  created_at timestamp with time zone default now()
);

-- Messages Table (Chat History) -> Optional, might be heavy
create table if not exists messages (
  id text primary key,
  contact_id text references contacts(id),
  text text,
  sender text, -- 'user' or 'contact'
  timestamp timestamp with time zone default now(),
  status text, -- 'sent', 'delivered', 'read'
  type text default 'text' -- 'text', 'image', 'audio', 'note'
);

create index if not exists messages_contact_id_idx on messages(contact_id);

-- Enable RLS (Row Level Security) - Optional for now ensuring local dev works
alter table contacts enable row level security;
alter table campaigns enable row level security;
alter table campaign_logs enable row level security;
alter table properties enable row level security;
alter table messages enable row level security;

-- Public access policies (for development simplicity, should be refined for production)
create policy "Allow public access for now" on contacts for all using (true);
create policy "Allow public access for now" on campaigns for all using (true);
create policy "Allow public access for now" on campaign_logs for all using (true);
create policy "Allow public access for now" on properties for all using (true);
create policy "Allow public access for now" on messages for all using (true);
-- Profiles Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Function to handle new user signup
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

-- Trigger to call function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Settings Table (Unified Store for all configs)
create table if not exists settings (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}',
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table settings enable row level security;

-- Policies
create policy "Users can manage their own settings." on settings for all using (auth.uid() = user_id);

-- Updated_at trigger for settings
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_settings_updated_at
    before update on settings
    for each row execute procedure update_updated_at_column();

