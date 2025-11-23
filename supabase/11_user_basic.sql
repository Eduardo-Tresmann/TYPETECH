-- ============================================================================
-- FUNÇÃO AUXILIAR: Buscar Informações Básicas de Usuário
-- ============================================================================
-- Propósito:
--   Retorna informações básicas de um usuário (ID, nome de exibição, avatar)
--   Combina dados de auth.users e profiles
--   Usa security definer para acessar auth.users
--
-- Dependências:
--   - Requer: profiles.sql (tabela profiles deve existir)
--
-- Parâmetros:
--   p_user: UUID do usuário
--
-- Retorna:
--   - id: UUID do usuário
--   - display_name: Nome de exibição (ou prefixo do email se não houver perfil)
--   - avatar_url: URL do avatar (ou null)
--
-- Ordem de execução: 11/14
-- ============================================================================

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

-- Garantir permissões de execução
grant execute on function public.user_basic(uuid) to authenticated;
grant execute on function public.user_basic(uuid) to anon;
