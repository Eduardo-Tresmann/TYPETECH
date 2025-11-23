-- ============================================================================
-- TABELA DE PERFIS DE USUÁRIO
-- ============================================================================
-- Propósito:
--   Armazena informações de perfil dos usuários (nome de exibição e avatar)
--   vinculadas à tabela auth.users do Supabase Auth
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 2/14
-- ============================================================================

-- Criação da tabela de perfis
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Índice único para garantir que nomes de exibição sejam únicos (case-insensitive)
create unique index if not exists profiles_display_name_unique
  on public.profiles ((lower(trim(display_name))))
  where display_name is not null;

-- Função para normalizar o nome de exibição (remover espaços extras)
create or replace function public.normalize_display_name()
returns trigger as $$
begin
  if new.display_name is not null then
    new.display_name := trim(new.display_name);
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger para normalizar automaticamente o nome de exibição
drop trigger if exists profiles_normalize_display_name on public.profiles;
create trigger profiles_normalize_display_name
before insert or update on public.profiles
for each row execute function public.normalize_display_name();

-- Constraint para validar tamanho do nome de exibição (3 a 24 caracteres)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_display_name_len_chk'
  ) then
    alter table public.profiles add constraint profiles_display_name_len_chk
      check (display_name is null or char_length(trim(display_name)) between 3 and 24);
  end if;
end $$;

-- Índice para consultas ordenadas por data de atualização
create index if not exists profiles_updated_idx on public.profiles (updated_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Habilita segurança em nível de linha para proteger dados dos usuários
alter table public.profiles enable row level security;

-- Policy de LEITURA: Todos podem consultar perfis
-- (Necessário para exibir nomes/avatares em leaderboards públicos)
-- Para restringir apenas a usuários autenticados, troque `using (true)` por `to authenticated`
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select
  using (true);

-- Policy de INSERÇÃO: Usuários autenticados só podem criar seu próprio perfil
drop policy if exists profiles_upsert_own on public.profiles;
create policy profiles_upsert_own on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Policy de ATUALIZAÇÃO: Usuários autenticados só podem atualizar seu próprio perfil
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
