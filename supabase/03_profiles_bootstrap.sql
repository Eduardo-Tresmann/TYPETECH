-- ============================================================================
-- BOOTSTRAP DE PERFIS DE USUÁRIO
-- ============================================================================
-- Propósito:
--   - Cria automaticamente um perfil quando um novo usuário se registra
--   - Migra usuários existentes que ainda não possuem perfil
--
-- Dependências:
--   - Requer: profiles.sql (tabela profiles deve existir)
--   - Referencia: auth.users (tabela do Supabase Auth)
--
-- Ordem de execução: 3/14
-- ============================================================================

-- Função que cria automaticamente um perfil quando um novo usuário é criado
-- Usa o prefixo do email como nome de exibição inicial
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, display_name, avatar_url, updated_at)
  values (new.id, split_part(new.email, '@', 1), null, now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger que executa a função acima quando um novo usuário é inserido em auth.users
drop trigger if exists on_auth_users_create_profile on auth.users;
create trigger on_auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_user();

-- Migração: Cria perfis para usuários existentes que ainda não possuem perfil
-- (Execute apenas uma vez após criar a tabela profiles)
insert into public.profiles(id, display_name, avatar_url, updated_at)
select u.id, split_part(u.email, '@', 1), null, now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
