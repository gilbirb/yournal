
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

alter table public.entries
  add column search_vector tsvector
  generated always as (to_tsvector('english', content)) stored;

create index entries_search_idx on public.entries using gin (search_vector);

create table public.llm_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);

alter table public.llm_usage enable row level security;

create or replace function public.bump_llm_usage(p_user_id uuid)
returns int
language sql
as $$
  insert into public.llm_usage (user_id, day, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set count = llm_usage.count + 1
  returning count;
$$;

grant all on table public.llm_usage to service_role;
revoke execute on function public.bump_llm_usage(uuid) from public, anon, authenticated;
grant execute on function public.bump_llm_usage(uuid) to service_role;
