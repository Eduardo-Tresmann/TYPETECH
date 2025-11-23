create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, display_name, avatar_url, updated_at)
  values (new.id, split_part(new.email, '@', 1), null, now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_users_create_profile on auth.users;
create trigger on_auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles(id, display_name, avatar_url, updated_at)
select u.id, split_part(u.email, '@', 1), null, now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
