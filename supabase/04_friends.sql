-- ============================================================================
-- TABELA DE AMIZADES
-- ============================================================================
-- Propósito:
--   Armazena relacionamentos de amizade entre usuários
--   Usa uma estrutura bidirecional (user_a < user_b) para evitar duplicatas
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 4/14
-- ============================================================================

-- Criação da tabela de amizades
-- user_a e user_b são sempre ordenados (user_a < user_b) para evitar duplicatas
create table if not exists public.friends (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friends_order_chk check (user_a < user_b),
  constraint friends_unique unique (user_a, user_b)
);

-- Índice para consultas ordenadas por data de criação
create index if not exists friends_created_idx on public.friends (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.friends enable row level security;

-- Policy de LEITURA: Usuários autenticados só podem ver suas próprias amizades
drop policy if exists friends_select on public.friends;
create policy friends_select on public.friends
  for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Policy de INSERÇÃO: Usuários autenticados só podem criar amizades onde são parte
drop policy if exists friends_insert on public.friends;
create policy friends_insert on public.friends
  for insert to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);
