-- ============================================================================
-- TABELA DE RESULTADOS DE DIGITAÇÃO
-- ============================================================================
-- Propósito:
--   Armazena resultados de testes de digitação dos usuários
--   Suporta durações de 15, 30, 60 e 120 segundos
--   Armazena métricas: WPM, precisão, acertos e erros
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 7/14
-- ============================================================================

-- Criação da tabela de resultados de digitação
create table if not exists public.typing_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_time int not null check (total_time in (15,30,60,120)), -- Duração do teste em segundos
  wpm int not null check (wpm >= 0), -- Palavras por minuto
  accuracy numeric not null check (accuracy >= 0 and accuracy <= 100), -- Precisão em porcentagem
  correct_letters int not null default 0 check (correct_letters >= 0), -- Letras corretas
  incorrect_letters int not null default 0 check (incorrect_letters >= 0), -- Letras incorretas
  created_at timestamptz not null default now() -- Data/hora do teste
);

-- Índice para consultas de leaderboards (ordenado por duração, WPM e data)
create index if not exists typing_results_top_idx on public.typing_results (total_time, wpm desc, created_at desc);

-- Índice para consultas de histórico do usuário
create index if not exists typing_results_user_idx on public.typing_results (user_id, created_at desc);

-- Índice adicional para histórico ordenado por data/hora
create index if not exists typing_results_created_idx on public.typing_results (user_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.typing_results enable row level security;

-- Policy de INSERÇÃO: Usuários autenticados só podem inserir seus próprios resultados
drop policy if exists typing_results_insert_own on public.typing_results;
create policy typing_results_insert_own on public.typing_results
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy de LEITURA: Leitura aberta para todos (necessário para leaderboards públicos)
-- Para restringir apenas a usuários autenticados, troque `using (true)` por `to authenticated`
drop policy if exists typing_results_select_all on public.typing_results;
create policy typing_results_select_all on public.typing_results
  for select
  using (true);
