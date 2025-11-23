-- ============================================================================
-- TABELA DE SOLICITAÇÕES DE AMIZADE
-- ============================================================================
-- Propósito:
--   Gerencia solicitações de amizade entre usuários
--   Estados possíveis: pending, accepted, rejected, cancelled
--
-- Dependências:
--   - Requer: init.sql (extensão pgcrypto)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 5/14
-- ============================================================================

-- Criação da tabela de solicitações de amizade
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected','cancelled')) default 'pending',
  created_at timestamptz not null default now()
);

-- Índice para consultas ordenadas por data de criação
create index if not exists friend_requests_created_idx on public.friend_requests (created_at desc);

-- Índice único para evitar múltiplas solicitações pendentes entre o mesmo par de usuários
create unique index if not exists friend_requests_unique_pair on public.friend_requests (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id)
) where status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.friend_requests enable row level security;

-- Policy de LEITURA: Usuários autenticados só podem ver suas próprias solicitações
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Policy de INSERÇÃO: Usuários autenticados só podem enviar solicitações (não podem ser o destinatário)
drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated
  with check (auth.uid() = sender_id and sender_id <> recipient_id);

-- Policy de ATUALIZAÇÃO: 
--   - Destinatário pode aceitar ou rejeitar
--   - Remetente pode cancelar
drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests
  for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id)
  with check (
    case
      when auth.uid() = recipient_id then status in ('accepted','rejected')
      when auth.uid() = sender_id then status = 'cancelled'
      else false
    end
  );

-- ============================================================================
-- FUNÇÃO AUXILIAR: Aceitar Solicitação de Amizade
-- ============================================================================
-- Propósito:
--   Aceita uma solicitação de amizade e cria o relacionamento na tabela friends
--   Atualiza o status da solicitação para 'accepted'
--
-- Parâmetros:
--   p_request: UUID da solicitação de amizade
create or replace function public.accept_friend_request(p_request uuid)
returns void as $$
declare r record;
begin
  -- Buscar a solicitação
  select * into r from public.friend_requests where id = p_request;
  
  -- Verificar se o usuário atual é o destinatário
  if r.recipient_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  
  -- Verificar se a solicitação está pendente
  if r.status <> 'pending' then
    raise exception 'invalid status';
  end if;
  
  -- Criar amizade (ordenando os IDs para manter consistência)
  insert into public.friends(user_a, user_b)
    values (least(r.sender_id, r.recipient_id), greatest(r.sender_id, r.recipient_id))
  on conflict do nothing;
  
  -- Atualizar status da solicitação
  update public.friend_requests set status = 'accepted' where id = p_request;
end;
$$ language plpgsql security definer;
