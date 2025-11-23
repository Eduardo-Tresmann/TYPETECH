create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected','cancelled')) default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists friend_requests_created_idx on public.friend_requests (created_at desc);
create unique index if not exists friend_requests_unique_pair on public.friend_requests (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id)
) where status = 'pending';

alter table public.friend_requests enable row level security;

drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests
  for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id)
  with check (
    case
      when auth.uid() = recipient_id then status in ('accepted','rejected')
      when auth.uid() = sender_id then status = 'cancelled'
      else false
    end
  );

create or replace function public.accept_friend_request(p_request uuid)
returns void as $$
declare r record;
begin
  select * into r from public.friend_requests where id = p_request;
  if r.recipient_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  if r.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  insert into public.friends(user_a, user_b)
    values (least(r.sender_id, r.recipient_id), greatest(r.sender_id, r.recipient_id))
  on conflict do nothing;
  update public.friend_requests set status = 'accepted' where id = p_request;
end;$$ language plpgsql security definer;
