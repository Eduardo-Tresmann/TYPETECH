-- ============================================================================
-- TABELA DE NOTIFICAÇÕES
-- ============================================================================
-- Propósito:
--   Armazena notificações para usuários sobre:
--   - Solicitações de amizade recebidas
--   - Mensagens diretas recebidas
--   - Recordes de digitação superados por amigos
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 8/14
-- ============================================================================

-- Criação da tabela de notificações
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade, -- Usuário que recebe a notificação
  type text not null check (type in ('friend_request', 'message', 'record_beaten')), -- Tipo de notificação
  related_id text, -- ID relacionado (pode ser UUID ou bigint dependendo do tipo)
  related_user_id uuid references auth.users(id) on delete cascade, -- Usuário que gerou a notificação
  metadata jsonb, -- Dados extras em JSON (ex: WPM do recorde, duração, etc)
  read_at timestamptz null, -- Timestamp de quando a notificação foi lida (null = não lida)
  created_at timestamptz not null default now() -- Data/hora de criação
);

-- Índice para consultas de notificações do usuário ordenadas por data
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- Índice para consultas de notificações não lidas
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read_at) where read_at is null;

-- Índice para consultas por tipo de notificação
create index if not exists notifications_type_idx on public.notifications (type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.notifications enable row level security;

-- Policy de LEITURA: Usuários autenticados só podem ver suas próprias notificações
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- Policy de INSERÇÃO: Permite inserção via triggers/funções (security definer)
drop policy if exists notifications_insert_system on public.notifications;
create policy notifications_insert_system on public.notifications
  for insert to authenticated
  with check (true); -- Triggers e funções usarão security definer

-- Policy de ATUALIZAÇÃO: Usuários autenticados só podem atualizar suas próprias notificações
-- (usado principalmente para marcar como lida)
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy de DELEÇÃO: Usuários autenticados podem deletar suas próprias notificações
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

