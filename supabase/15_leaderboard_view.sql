-- ============================================================================
-- VISÃO E FUNÇÃO PARA LEADERBOARDS PÚBLICOS
-- ============================================================================
-- Propósito:
--   - Disponibilizar resultados verificados sem expor a tabela base
--   - Função com SECURITY DEFINER contorna as políticas de RLS para leitura controlada
-- ============================================================================

create or replace view public.leaderboard_verified_view
with (security_barrier = true)
as
select
  tr.id,
  tr.user_id,
  tr.total_time,
  tr.wpm,
  tr.accuracy,
  tr.correct_letters,
  tr.incorrect_letters,
  tr.created_at,
  p.display_name,
  p.avatar_url,
  nullif(split_part(coalesce(u.email, ''), '@', 1), '') as email_prefix
from public.typing_results tr
left join public.profiles p on p.id = tr.user_id
left join auth.users u on u.id = tr.user_id
where tr.verified is true;

comment on view public.leaderboard_verified_view is
  'Resultados aprovados para exibição pública nos leaderboards.';

-- Remover função existente se houver (necessário se o tipo de retorno mudou)
drop function if exists public.leaderboard_for_time(integer, integer);
drop function if exists public.leaderboard_for_time(int, int);

create or replace function public.leaderboard_for_time(
  p_total_time int,
  p_limit int default 50
)
returns table (
  user_id uuid,
  total_time int,
  wpm int,
  accuracy numeric,
  created_at timestamptz,
  correct_letters int,
  incorrect_letters int,
  display_name text,
  avatar_url text,
  email_prefix text
)
language plpgsql
security definer
set search_path = public
stable
as
$$
declare
  v_limit int := least(coalesce(p_limit, 50), 200);
begin
  return query
  select
    lv.user_id,
    lv.total_time,
    lv.wpm,
    lv.accuracy,
    lv.created_at,
    lv.correct_letters,
    lv.incorrect_letters,
    lv.display_name,
    lv.avatar_url,
    lv.email_prefix
  from public.leaderboard_verified_view lv
  where lv.total_time = p_total_time
  order by lv.wpm desc, lv.accuracy desc, lv.created_at asc
  limit v_limit;
end;
$$;

revoke all on function public.leaderboard_for_time(int, int) from public;
grant execute on function public.leaderboard_for_time(int, int) to authenticated, anon;

