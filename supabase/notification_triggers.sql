-- Função para criar notificação de solicitação de amizade
create or replace function public.create_friend_request_notification()
returns trigger as $$
begin
  -- Criar notificação apenas para o destinatário quando status é 'pending'
  if new.status = 'pending' then
    insert into public.notifications (user_id, type, related_id, related_user_id)
    values (new.recipient_id, 'friend_request', new.id, new.sender_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar notificação ao inserir solicitação de amizade
drop trigger if exists friend_requests_notification_trigger on public.friend_requests;
create trigger friend_requests_notification_trigger
  after insert on public.friend_requests
  for each row
  execute function public.create_friend_request_notification();

-- Função para criar notificação de mensagem recebida
create or replace function public.create_message_notification()
returns trigger as $$
begin
  -- Criar notificação apenas para o destinatário
  insert into public.notifications (user_id, type, related_id, related_user_id)
  values (new.recipient_id, 'message', new.id::text, new.sender_id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para criar notificação ao inserir mensagem
drop trigger if exists direct_messages_notification_trigger on public.direct_messages;
create trigger direct_messages_notification_trigger
  after insert on public.direct_messages
  for each row
  execute function public.create_message_notification();

-- Função para limpar notificações relacionadas quando uma solicitação é aceita/rejeitada
create or replace function public.cleanup_friend_request_notifications()
returns trigger as $$
begin
  -- Quando uma solicitação é aceita ou rejeitada, podemos marcar a notificação como lida
  -- ou deletá-la. Vamos deletá-la para manter o sistema limpo.
  if old.status = 'pending' and new.status in ('accepted', 'rejected', 'cancelled') then
    delete from public.notifications
    where type = 'friend_request' and related_id = new.id::text;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para limpar notificações quando solicitação muda de status
drop trigger if exists friend_requests_cleanup_notification_trigger on public.friend_requests;
create trigger friend_requests_cleanup_notification_trigger
  after update on public.friend_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.cleanup_friend_request_notifications();

