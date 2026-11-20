-- Esegui nello SQL Editor di Supabase (una volta sola).

create table if not exists public.docs (
  user_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind      text        not null check (kind in ('entry', 'workout', 'template')),
  id        text        not null,
  data      jsonb       not null default '{}'::jsonb,
  updated   bigint      not null,               -- ms, orologio del dispositivo
  deleted   boolean     not null default false, -- lapide
  server_ts timestamptz not null default now(), -- usato dal pull incrementale
  primary key (user_id, kind, id)
);

create index if not exists docs_user_server_ts on public.docs (user_id, server_ts);

alter table public.docs enable row level security;

drop policy if exists "docs: solo i miei" on public.docs;
create policy "docs: solo i miei" on public.docs
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Last-write-wins anche lato server: una scrittura più vecchia viene ignorata.
create or replace function public.docs_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated < old.updated then
    return old;
  end if;
  new.server_ts := now();
  return new;
end;
$$;

drop trigger if exists docs_touch on public.docs;
create trigger docs_touch
  before insert or update on public.docs
  for each row execute function public.docs_touch();
