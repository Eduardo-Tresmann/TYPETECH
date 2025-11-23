create table if not exists public.friends (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friends_order_chk check (user_a < user_b),
  constraint friends_unique unique (user_a, user_b)
);

create index if not exists friends_created_idx on public.friends (created_at desc);

alter table public.friends enable row level security;

drop policy if exists friends_select on public.friends;
create policy friends_select on public.friends
  for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists friends_insert on public.friends;
create policy friends_insert on public.friends
  for insert to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);
