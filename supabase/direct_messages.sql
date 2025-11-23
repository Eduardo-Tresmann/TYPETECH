create table if not exists public.direct_messages (
  id bigserial primary key,
  pair_key text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists dm_pair_idx on public.direct_messages (pair_key);
create index if not exists dm_created_idx on public.direct_messages (created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages
  for select to authenticated
  using (
    position(auth.uid()::text in pair_key) > 0 and (auth.uid() = sender_id or auth.uid() = recipient_id)
  );

drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
  for insert to authenticated
  with check (
    position(auth.uid()::text in pair_key) > 0 and auth.uid() = sender_id
  );
