## Objetivo
- Manter o acesso padrão à Home (`/`) e oferecer login/registro opcionais via botão no topo direito.

## Estado Atual
- A rota raiz já carrega a Home via `src/app/page.tsx` importando `src/app/home/page.tsx`. Nada muda aqui.

## Dependências e Configuração
- Instalar `@supabase/supabase-js`.
- Configurar `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sem commitar).

## Cliente e Provider
- `src/lib/supabaseClient.ts`: instanciar o cliente Supabase com env vars.
- `src/context/AuthContext.tsx`: provider para sessão (`user`, `loading`, `signOut`), usando `supabase.auth.onAuthStateChange`.
- Envolver `src/app/layout.tsx` com `AuthProvider` para estado global.

## UI: Botão no Topo Direito
- Criar `src/shared/components/Header.tsx` com layout:
  - Título central “TypeTech”.
  - Botão à direita: `Entrar` quando deslogado; avatar/iniciais com menu (`Perfil`, `Sair`) quando logado.
- Substituir o cabeçalho em `src/app/home/page.tsx` por `Header`.
- Clique em `Entrar` navega para `/auth/login`.

## Páginas de Autenticação
- `src/app/auth/login/page.tsx` (client):
  - Formulário email/senha com `supabase.auth.signInWithPassword`.
  - Botões OAuth (ex.: Google) com `supabase.auth.signInWithOAuth`.
  - Link “Criar conta” para `/auth/register`.
- `src/app/auth/register/page.tsx` (client):
  - Formulário email/senha com `supabase.auth.signUp`.
  - Mensagem de confirmação de e-mail quando aplicável.
  - Link “Já tenho conta” para `/auth/login`.
- Componentizar inputs/validação em `src/components/AuthForm.tsx`.

## Fluxos e Navegação
- Após login/registro bem-sucedido: redirect para `/home`.
- `Header` reflete sessão em tempo real via `useAuth()`.
- Implementar `signOut()` no menu do usuário.

## Segurança
- Sem logs de segredos; tratamento de erros amigável.
- Login opcional: nenhuma rota protegida por enquanto.

## Arquivos
- Criar: `src/lib/supabaseClient.ts`, `src/context/AuthContext.tsx`, `src/shared/components/Header.tsx`, `src/components/AuthForm.tsx`, `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`.
- Alterar: `src/app/layout.tsx` (envolver com `AuthProvider`), `src/app/home/page.tsx` (usar `Header`).

## Validação
- Executar dev, testar: entrar na Home, clicar `Entrar`, fluxo de login/registro, logout, redirecionamentos.

Confirma seguir com esta implementação?