-- ============================================================================
-- ROTINAS DE AUDITORIA DE RESULTADOS
-- ============================================================================
-- Propósito:
--   - Registrar e invalidar resultados suspeitos (WPM irreal, precisão > 100, etc.)
--   - Permitir reprocessamento manual após incidentes de segurança
-- ============================================================================

create table if not exists public.typing_results_audit_log (
  id bigserial primary key,
  typing_result_id uuid not null references public.typing_results(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint unique_result_reason unique (typing_result_id, reason)
);

comment on table public.typing_results_audit_log is
  'Histórico de resultados marcados como suspeitos durante auditorias.';

create or replace function public.flag_suspicious_typing_results(
  p_max_wpm int default null,
  p_max_accuracy numeric default null
)
returns table (
  typing_result_id uuid,
  reason text
)
language plpgsql
security definer
set search_path = public
as
$$
declare
  rec record;
begin
  for rec in
    select
      id,
      case
        when accuracy < 0 then 'Precisão negativa'
        when correct_letters > 100000 then 'Letras corretas irreais'
        when incorrect_letters > 100000 then 'Letras incorretas irreais'
        else 'Inconsistência não mapeada'
      end as reason
    from public.typing_results
    where verified is true
      and (
        accuracy < 0
        or correct_letters > 100000
        or incorrect_letters > 100000
      )
  loop
    update public.typing_results
      set verified = false
      where id = rec.id;

    insert into public.typing_results_audit_log (typing_result_id, reason)
      values (rec.id, rec.reason)
      on conflict on constraint unique_result_reason do nothing;

    typing_result_id := rec.id;
    reason := rec.reason;
    return next;
  end loop;
end;
$$;

revoke all on function public.flag_suspicious_typing_results(int, numeric) from public;

