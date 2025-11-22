## Objetivo
Salvar todos os resultados de testes no Supabase e mostrar:
- Leaderboards dos melhores (por duração 15/30/60/120)
- Estatísticas completas do usuário (histórico, melhores, médias, totais)

## Estrutura no Banco (Supabase)
1. Criar tabela `public.typing_results`:
   - `id uuid primary key default gen_random_uuid()`
   - `user_id uuid not null references auth.users(id) on delete cascade`
   - `total_time int not null check (total_time in (15,30,60,120))`
   - `wpm int not null check (wpm >= 0)`
   - `accuracy numeric not null check (accuracy >= 0 and accuracy <= 100)`
   - `correct_letters int not null default 0`
   - `incorrect_letters int not null default 0`
   - `created_at timestamptz not null default now()`
2. Índices:
   - `create index typing_results_top_idx on typing_results (total_time, wpm desc, created_at desc);`
   - `create index typing_results_user_idx on typing_results (user_id, created_at desc);`
3. RLS:
   - `alter table typing_results enable row level security;`
   - Policy INSERT (apenas dono): `create policy insert_own on typing_results for insert to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);`
   - Policy SELECT (para leaderboards públicas):
     - Se leaderboards forem públicas: `create policy select_all on typing_results for select to anon, authenticated using (true);`
     - Se quiser somente usuários logados: `to authenticated using (true);`
4. (Opcional) Relacionamento com `profiles` para exibir nome/avatares:
   - Garantir que `profiles.id` = `auth.users.id`
   - Manter `profiles` com policy de SELECT para todos (ou criar uma view só com `display_name, avatar_url`)

## Integração no App (salvar resultados)
1. Criar util `saveTypingResult({ total_time, wpm, accuracy, correctLetters, incorrectLetters })` usando `getSupabase()`.
2. Chamar ao finalizar o teste:
   - No `useTypingTest` (quando `isFinished` vira `true`) ou imediatamente após renderizar `ResultsScreen`.
   - Enviar também `user_id` via sessão (`supabase.auth.getUser()` ou `supabase.auth.getSession()`).
3. Tratar falhas com `translateError` e exibir feedback discreto na UI.

## Leaderboards (UI e dados)
1. Página `Leaderboards`:
   - Filtro de duração reutilizando `ModeBar` (15/30/60/120).
   - Query: `from('typing_results').select('wpm, accuracy, user_id, created_at, total_time, profiles(display_name, avatar_url)').eq('total_time', selected).order('wpm', { descending: true }).limit(50)`.
   - Mostrar: posição (rank), `display_name`/avatar, `wpm`, `accuracy`, data.
2. (Opcional) filtros adicionais:
   - Últimas 24h, 7 dias, global; campo `created_at` com intervalo.
   - Botões de paginação ou infinite scroll.

## Estatísticas do Usuário
1. Página `Estatísticas`:
   - Query: `from('typing_results').select('*').eq('user_id', user.id).order('created_at', { descending: true })`.
   - KPIs:
     - Melhor WPM (por duração e geral)
     - Média de WPM e de precisão
     - Total de testes, acertos, erros
   - Histórico:
     - Lista/ tabela com cada teste (data, tempo, wpm, precisão)
   - (Opcional) gráficos simples (linha/ barras) com WPM ao longo do tempo e distribuição por duração.

## Componentes/Alterações no Código
1. `src/lib/db.ts` (novo): função `saveTypingResult`.
2. `src/hooks/useTyping.tsx`: chamar `saveTypingResult` ao finalizar.
3. `src/app/leaderboards/page.tsx`: substituir placeholder pelo ranking com `ModeBar` e lista.
4. `src/app/stats/page.tsx`: substituir placeholder por KPIs e histórico.
5. Reusar estilos existentes (`bg-[#2c2e31]`, tipografia, cards).

## Segurança e Performance
- Não expor email no leaderboard; usar `display_name`/avatar.
- RLS garante que apenas o dono insere seus resultados; leitura conforme escolha (pública ou somente autenticados).
- Índices criados para consultas rápidas em leaderboards e estatísticas.

## Validação
- Rodar testes manuais: finalizar testes nas quatro durações e verificar inserção.
- Checar leaderboards: novo resultado aparece na posição correta.
- Checar estatísticas: KPIs e histórico refletem os resultados recém-salvos.

## Próximos passos
- Confirmar se leaderboards devem ser públicas (visíveis sem login) ou apenas para usuários logados, para definir a policy de SELECT.
- Confirmar se podemos mostrar nome/avatars no leaderboard (implica SELECT em `profiles`).