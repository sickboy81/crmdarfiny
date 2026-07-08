-- Email manager
create table if not exists public.user_emails (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  from_email text,
  to_email text not null,
  subject text not null,
  content text,
  html_content text,
  status text default 'sent',
  attachments jsonb default '[]',
  scheduled_at timestamptz,
  is_starred boolean default false,
  is_draft boolean default false,
  is_spam boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_user_emails_account_id on user_emails(account_id);

alter table public.user_emails enable row level security;

create policy "Users can view their own emails"
  on public.user_emails for select
  using (is_account_member(account_id));

create policy "Users can insert their own emails"
  on public.user_emails for insert
  with check (is_account_member(account_id));

create policy "Users can update their own emails"
  on public.user_emails for update
  using (is_account_member(account_id));

create policy "Users can delete their own emails"
  on public.user_emails for delete
  using (is_account_member(account_id));
