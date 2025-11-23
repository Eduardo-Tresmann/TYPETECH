-- ============================================================================
-- FUNÇÃO DE BUSCA: Buscar Usuários (Nome ou Email)
-- ============================================================================
-- Propósito:
--   Busca usuários por nome de exibição ou email
--   Combina dados de auth.users e profiles
--   Usa security definer para acessar auth.users
--
-- Dependências:
--   - Requer: profiles.sql (tabela profiles deve existir)
--
-- Parâmetros:
--   p_query: Texto de busca (busca em nome de exibição e email)
--   p_limit: Número máximo de resultados (padrão: 20)
--
-- Retorna:
--   - id: UUID do usuário
--   - display_name: Nome de exibição (ou prefixo do email se não houver perfil)
--   - avatar_url: URL do avatar (ou null)
--
-- Ordem de execução: 13/14
-- ============================================================================

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

-- Garantir permissões de execução
grant execute on function public.search_users(text, int) to authenticated;
grant execute on function public.search_users(text, int) to anon;
