-- ============================================================================
-- TRIGGER: Verificar Recordes Superados
-- ============================================================================
-- Propósito:
--   Quando um usuário completa um teste de digitação, verifica se o resultado
--   supera os recordes de seus amigos. Se sim, cria notificações para os amigos
--   cujos recordes foram superados.
--
-- Dependências:
--   - Requer: typing_results.sql (tabela typing_results deve existir)
--   - Requer: friends.sql (tabela friends deve existir)
--   - Requer: notifications.sql (tabela notifications deve existir)
--
-- Lógica:
--   - Verifica recorde geral do amigo (melhor WPM de todos os tempos)
--   - Verifica recorde específico da duração do amigo
--   - Cria notificação se o novo resultado supera qualquer um dos recordes
--
-- Ordem de execução: 14/14 (ÚLTIMO)
-- ============================================================================

-- Função que verifica recordes superados e cria notificações
create or replace function public.check_and_notify_record_beaten()
returns trigger as $$
declare
  friend_record record;
  friend_best_wpm numeric;
  friend_best_by_time numeric;
  friend_id_val uuid;
  should_notify boolean;
begin
  -- Encontrar todos os amigos do usuário que fez o teste
  for friend_record in
    select 
      case 
        when user_a = new.user_id then user_b
        else user_a
      end as friend_id
    from public.friends
    where user_a = new.user_id or user_b = new.user_id
  loop
    friend_id_val := friend_record.friend_id;
    should_notify := false;
    
    -- Verificar recorde geral do amigo (melhor WPM de todos os tempos)
    select max(wpm) into friend_best_wpm
    from public.typing_results
    where user_id = friend_id_val;
    
    -- Verificar recorde específico da duração do amigo
    select max(wpm) into friend_best_by_time
    from public.typing_results
    where user_id = friend_id_val and total_time = new.total_time;
    
    -- Verificar se o novo resultado supera algum recorde
    if friend_best_wpm is not null and new.wpm > friend_best_wpm then
      should_notify := true;
    elsif friend_best_by_time is not null and new.wpm > friend_best_by_time then
      should_notify := true;
    end if;
    
    -- Criar notificação para o amigo cujo recorde foi superado
    if should_notify then
      insert into public.notifications (
        user_id, 
        type, 
        related_id, 
        related_user_id,
        metadata
      )
      values (
        friend_id_val, -- O amigo recebe a notificação
        'record_beaten',
        new.id::text,
        new.user_id, -- O usuário que fez o teste
        jsonb_build_object(
          'wpm', new.wpm,
          'total_time', new.total_time,
          'previous_best', coalesce(friend_best_by_time, friend_best_wpm),
          'beaten_type', case 
            when friend_best_by_time is not null and new.wpm > friend_best_by_time then 'duration'
            when friend_best_wpm is not null and new.wpm > friend_best_wpm then 'overall'
            else 'duration'
          end
        )
      );
    end if;
  end loop;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima após inserção de resultado de digitação
drop trigger if exists typing_results_record_beaten_trigger on public.typing_results;
create trigger typing_results_record_beaten_trigger
  after insert on public.typing_results
  for each row
  execute function public.check_and_notify_record_beaten();

