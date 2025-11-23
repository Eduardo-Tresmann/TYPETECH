-- ============================================================================
-- FUNÇÃO DE BUSCA: Buscar Perfis por Similaridade
-- ============================================================================
-- Propósito:
--   Busca perfis de usuários por similaridade de nome de exibição
--   Usa extensão pg_trgm para busca fuzzy (tolerante a erros de digitação)
--
-- Dependências:
--   - Requer: profiles.sql (tabela profiles deve existir)
--   - Requer: Extensão pg_trgm (habilitada automaticamente)
--
-- Parâmetros:
--   p_query: Texto de busca
--   p_limit: Número máximo de resultados (padrão: 20)
--
-- Retorna:
--   - id: UUID do perfil
--   - display_name: Nome de exibição
--   - avatar_url: URL do avatar
--   - score: Pontuação de similaridade (0.0 a 1.0)
--
-- Ordem de execução: 12/14
-- ============================================================================

-- Extensão para busca de similaridade de texto (trigram matching)
create extension if not exists pg_trgm;

-- Índice GIN para busca rápida por similaridade
create index if not exists profiles_trgm_idx
  on public.profiles using gin (lower(display_name) gin_trgm_ops);

-- Função de busca por similaridade
drop function if exists public.search_profiles(text, int);

create or replace function public.search_profiles(p_query text, p_limit int default 20)
returns table (id uuid, display_name text, avatar_url text, score real)
language sql 
stable
as $$
  select 
    p.id, 
    p.display_name, 
    p.avatar_url,
    greatest(
      similarity(lower(p.display_name), lower(p_query)),
      case when lower(p.display_name) like '%'||lower(p_query)||'%' then 1.0 else 0.0 end
    ) as score
  from public.profiles p
  where p.display_name is not null
    and (
      lower(p.display_name) like '%'||lower(p_query)||'%'
      or similarity(lower(p.display_name), lower(p_query)) > 0.1
    )
  order by score desc, p.updated_at desc
  limit coalesce(p_limit, 20);
$$;

-- Garantir permissões de execução
grant execute on function public.search_profiles(text, int) to authenticated;
grant execute on function public.search_profiles(text, int) to anon;
