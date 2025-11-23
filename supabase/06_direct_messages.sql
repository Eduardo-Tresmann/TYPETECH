-- ============================================================================
-- TABELA DE MENSAGENS DIRETAS
-- ============================================================================
-- Propósito:
--   Armazena mensagens privadas entre dois usuários
--   Usa pair_key para agrupar mensagens de uma mesma conversa
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 6/14
-- ============================================================================

-- Criação da tabela de mensagens diretas
create table if not exists public.direct_messages (
  id bigserial primary key,
  pair_key text not null, -- Chave única para identificar a conversa (formato: "uuid1|uuid2")
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz null -- Timestamp de quando a mensagem foi lida
);

-- Índice para consultas por conversa (pair_key)
create index if not exists dm_pair_idx on public.direct_messages (pair_key);

-- Índice para consultas ordenadas por data de criação
create index if not exists dm_created_idx on public.direct_messages (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.direct_messages enable row level security;

-- Policy de LEITURA: Usuários autenticados só podem ver mensagens de suas conversas
drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages
  for select to authenticated
  using (
    position(auth.uid()::text in pair_key) > 0 and (auth.uid() = sender_id or auth.uid() = recipient_id)
  );

-- Policy de INSERÇÃO: Usuários autenticados só podem enviar mensagens onde são o remetente
drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages
  for insert to authenticated
  with check (
    position(auth.uid()::text in pair_key) > 0 and auth.uid() = sender_id
  );
