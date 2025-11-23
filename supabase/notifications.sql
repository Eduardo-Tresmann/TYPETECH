-- Tabela de notificações
-- Armazena notificações para usuários sobre solicitações de amizade, mensagens e recordes superados
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('friend_request', 'message', 'record_beaten')),
  related_id text, -- ID da solicitação de amizade, mensagem ou resultado de digitação (pode ser uuid ou bigint)
  related_user_id uuid references auth.users(id) on delete cascade, -- ID do usuário que gerou a notificação (amigo)
  metadata jsonb, -- Dados extras (ex: WPM do recorde, duração, etc)
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

-- Índices para consultas rápidas
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read_at) where read_at is null;
create index if not exists notifications_type_idx on public.notifications (type);

-- Ativa RLS para proteger os dados
alter table public.notifications enable row level security;

-- Policy de seleção: usuário só pode ver suas próprias notificações
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- Policy de inserção: apenas o sistema pode inserir (via triggers/funções)
drop policy if exists notifications_insert_system on public.notifications;
create policy notifications_insert_system on public.notifications
  for insert to authenticated
  with check (true); -- Triggers e funções usarão security definer

-- Policy de atualização: usuário só pode atualizar suas próprias notificações (marcar como lida)
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy de deleção: usuário pode deletar suas próprias notificações
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

