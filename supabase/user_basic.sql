-- Função para buscar informações básicas de um usuário
-- Retorna dados do auth.users e profiles (se existir)
-- Usa security definer para acessar auth.users

drop function if exists public.user_basic(uuid);

create or replace function public.user_basic(p_user uuid)
returns table (id uuid, display_name text, avatar_url text)
language plpgsql 
security definer 
stable
as $$
begin
  return query
  select 
    u.id,
    coalesce(p.display_name, split_part(u.email, '@', 1)) as display_name,
    p.avatar_url
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user;
end;
$$;

-- Garantir que a função seja acessível
grant execute on function public.user_basic(uuid) to authenticated;
grant execute on function public.user_basic(uuid) to anon;
