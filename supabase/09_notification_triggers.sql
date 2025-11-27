-- ============================================================================
-- TRIGGERS DE NOTIFICAÇÕES
-- ============================================================================
-- Propósito:
--   Cria notificações automaticamente quando eventos relevantes ocorrem:
--   - Solicitação de amizade enviada
--   - Solicitação de amizade aceita (notifica o remetente)
--   - Mensagem direta recebida
--   - Limpeza de notificações quando solicitação é resolvida
--
-- Dependências:
--   - Requer: notifications.sql (tabela notifications deve existir)
--   - Requer: friend_requests.sql (tabela friend_requests deve existir)
--   - Requer: direct_messages.sql (tabela direct_messages deve existir)
--
-- Ordem de execução: 9/14
-- ============================================================================

-- ============================================================================
-- NOTIFICAÇÃO: Solicitação de Amizade
-- ============================================================================
-- Função que cria notificação quando uma solicitação de amizade é enviada
create or replace function public.create_friend_request_notification()
returns trigger as $$
begin
  -- Criar notificação apenas para o destinatário quando status é 'pending'
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, related_id, related_user_id)
    values (new.recipient_id, 'friend_request', new.id::text, new.sender_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima quando uma solicitação é inserida
drop trigger if exists friend_requests_notification_trigger on public.friend_requests;
create trigger friend_requests_notification_trigger
  after insert on public.friend_requests
  for each row
  execute function public.create_friend_request_notification();

-- ============================================================================
-- NOTIFICAÇÃO: Mensagem Direta
-- ============================================================================
-- Função que cria notificação quando uma mensagem direta é enviada
create or replace function public.create_message_notification()
returns trigger as $$
begin
  -- Criar notificação apenas para o destinatário
  insert into public.notifications (user_id, type, related_id, related_user_id)
  values (new.recipient_id, 'message', new.id::text, new.sender_id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima quando uma mensagem é inserida
drop trigger if exists direct_messages_notification_trigger on public.direct_messages;
create trigger direct_messages_notification_trigger
  after insert on public.direct_messages
  for each row
  execute function public.create_message_notification();

-- ============================================================================
-- NOTIFICAÇÃO: Solicitação de Amizade Aceita
-- ============================================================================
-- Função que cria notificação para o remetente quando uma solicitação é aceita
create or replace function public.create_friend_request_accepted_notification()
returns trigger as $$
begin
  -- Quando uma solicitação muda de 'pending' para 'accepted', criar notificação para o remetente
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, type, related_id, related_user_id)
    values (new.sender_id, 'friend_request_accepted', new.id::text, new.recipient_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima quando o status de uma solicitação muda para 'accepted'
drop trigger if exists friend_requests_accepted_notification_trigger on public.friend_requests;
create trigger friend_requests_accepted_notification_trigger
  after update on public.friend_requests
  for each row
  when (old.status = 'pending' and new.status = 'accepted')
  execute function public.create_friend_request_accepted_notification();

-- ============================================================================
-- LIMPEZA: Notificações de Solicitação de Amizade
-- ============================================================================
-- Função que remove notificações quando uma solicitação é aceita/rejeitada/cancelada
create or replace function public.cleanup_friend_request_notifications()
returns trigger as $$
begin
  -- Quando uma solicitação muda de 'pending' para outro status, deleta a notificação
  if old.status = 'pending' and new.status in ('accepted', 'rejected', 'cancelled') then
    delete from public.notifications
    where type = 'friend_request' and related_id = new.id::text;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima quando o status de uma solicitação muda
drop trigger if exists friend_requests_cleanup_notification_trigger on public.friend_requests;
create trigger friend_requests_cleanup_notification_trigger
  after update on public.friend_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.cleanup_friend_request_notifications();

