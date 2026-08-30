
create table public.entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    content text not null default '',
    mood text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index entries_user_date_idx on public.entries (user_id, date);
grant all on table public.entries to service_role;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_touch_updated_at
  before update on public.entries
  for each row
  execute function public.touch_updated_at();