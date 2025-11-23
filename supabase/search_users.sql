-- Função para buscar usuários (inclui auth.users e profiles)
drop function if exists public.search_users(text, int);

create or replace function public.search_users(p_query text, p_limit int default 20)
returns table (id uuid, display_name text, avatar_url text)
language plpgsql 
security definer
as $$
begin
  return query
  select 
    u.id,
    coalesce(p.display_name, split_part(u.email, '@', 1)) as display_name,
    p.avatar_url
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    (p.display_name is not null and p.display_name ilike '%'||p_query||'%')
    or (u.email ilike '%'||p_query||'%')
  )
  order by u.created_at desc
  limit coalesce(p_limit, 20);
end;
$$;

-- Garantir permissões
grant execute on function public.search_users(text, int) to authenticated;
grant execute on function public.search_users(text, int) to anon;
