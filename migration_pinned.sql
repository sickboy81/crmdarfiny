alter table contacts add column if not exists pinned boolean default false; create index if not exists contacts_pinned_idx on contacts(pinned);
