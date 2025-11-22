## Objetivo
- Criar uma página de Perfil acessada ao clicar no ícone ou nome do usuário.
- Mover o botão de Sair para dentro da página de Perfil.
- Permitir editar: nome de exibição (padrão = parte do e‑mail antes do @), data de nascimento e foto de perfil.

## Modelo de Dados (Supabase)
- Tabela `profiles` (no Supabase):
  - `id uuid` (PK, referencia `auth.users.id`)
  - `display_name text`
  - `birth_date date`
  - `avatar_url text`
  - `updated_at timestamptz default now()`
- Políticas RLS:
  - Habilitar RLS
  - `SELECT/UPDATE/INSERT` apenas pelo próprio usuário (`auth.uid() = id`).
- Storage:
  - Bucket `avatars` (público) para fotos de perfil.
  - Caminho do arquivo: `${user.id}/{timestamp}-{filename}`.

## Fluxo e Comportamento
- Header: avatar e nome tornam-se links para `/profile`.
- Página `/profile`:
  - Se não autenticado: exibe aviso e link para `/auth/login`.
  - Se autenticado: carrega e exibe formulário com `display_name`, `birth_date`, `avatar`.
  - Botões:
    - `Salvar`: faz upsert em `profiles`.
    - `Sair`: chama `signOut()` e redireciona para `/home`.
  - Nome padrão: se não houver registro, pré-preenche com `email.split('@')[0]`.
  - Upload de avatar: envia para `avatars` e salva `avatar_url` com `getPublicUrl`.

## UI/UX
- Layout consistente com Tailwind (tema atual).
- Pré-visualização da foto após selecionar arquivo.
- Validações simples: nome obrigatório, data opcional, arquivos até ~2MB (jpeg/png).
- Mensagens de sucesso/erro amigáveis.

## Arquivos a criar/alterar
- Criar: `src/app/profile/page.tsx` (client page, formulário e lógica de salvar/upload).
- Alterar: `src/shared/components/Header.tsx` (remover botão Sair, tornar avatar/nome links para `/profile`).
- (Opcional) Criar `src/shared/components/Avatar.tsx` para reutilizar exibição de avatar.

## Integração Supabase
- Usar `getSupabase()` do cliente já criado.
- `select`/`upsert` na tabela `profiles` com `id = user.id`.
- Upload via `supabase.storage.from('avatars').upload(...)` e `getPublicUrl`.

## Validação
- Testar: clique no avatar/nome → `/profile`.
- Salvar nome e data → persistir e refletir no Header.
- Upload de foto → pré-visualiza e persiste; Header usa avatar atualizado.
- `Sair` dentro do Perfil → volta para `/home`.

## Próximos passos
- Implementar os componentes e páginas conforme descrito.
- Fornecer commits em português conforme solicitado.

Você confirma que devo prosseguir com essa implementação?