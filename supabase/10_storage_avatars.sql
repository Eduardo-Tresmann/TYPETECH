-- ============================================================================
-- STORAGE: BUCKET DE AVATARES
-- ============================================================================
-- Propósito:
--   Cria e configura o bucket de armazenamento para imagens de avatar dos usuários
--   Bucket público para permitir exibição de avatares no site
--
-- Dependências:
--   - Requer: Supabase Storage habilitado
--
-- Ordem de execução: 10/14
-- ============================================================================

-- Criação do bucket público para avatares
-- Nota: Se o bucket já existir, este comando será ignorado
select storage.create_bucket('avatars', public := true);

-- ============================================================================
-- POLÍTICAS DE STORAGE
-- ============================================================================

-- Policy de LEITURA: Qualquer usuário pode ler arquivos do bucket
-- (Necessário para exibição pública de avatares)
create policy if not exists avatars_read_all
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Policy de INSERÇÃO: Apenas usuários autenticados podem enviar arquivos
create policy if not exists avatars_write_auth
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Policy de ATUALIZAÇÃO: Apenas usuários autenticados podem atualizar arquivos
create policy if not exists avatars_update_auth
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

