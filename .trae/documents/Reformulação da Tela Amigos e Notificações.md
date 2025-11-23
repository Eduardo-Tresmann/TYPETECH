## Objetivos
- Corrigir falhas funcionais na tela "Amigos" (convites, lista de amigos, chat).
- Reformular completamente o visual, aplicando design moderno e UX consistente.
- Implementar ícone de notificação ao lado do nome do usuário na Home/Header com contador de não lidas e acesso rápido.

## Diagnóstico Atual
- Bug ao atualizar a lista de amigos após aceitar convite: consulta sem filtro do usuário, causando IDs incorretos (`src/app/friends/page.tsx:161-169`).
- Mensagens diretas não marcam leitura (`read_at`), impossibilitando contagem de não lidas.
- Convites e mensagens não atualizam em tempo real para o usuário quando recebidos.
- O ponto ideal para anexar o ícone é no botão do usuário no Header (`src/components/Header.tsx:103-114`).

## Correções Funcionais
1. Corrigir `acceptInvite` para filtrar amigos do usuário:
   - Alterar a consulta em `friends` para `.or('user_a.eq.<me>,user_b.eq.<me>')` antes de montar `ids` (`src/app/friends/page.tsx:161-169`).
2. Marcar mensagens como lidas ao abrir uma conversa:
   - Ao selecionar `selected`, executar `update` em `direct_messages` com `pair_key`, `recipient_id = user.id` e `read_at IS NULL` para definir `read_at = now()`.
   - Auto-scroll para última mensagem ao receber novos itens.
3. Assinaturas em tempo real:
   - `friend_requests`: assinar `INSERT` com filtro `recipient_id=eq.<user.id>` e atualizar `invites`.
   - `direct_messages`: já existe assinatura por `pair_key`; manter e otimizar para evitar duplicidade.
4. Estabilidade UX:
   - Estados de `loading`/desabilitar botões em “Enviar convite” e “Enviar”.
   - Mensagens de erro/sucesso consistentes e não intrusivas.

## Reformulação Visual (UI/UX)
- Layout em duas colunas com cards elevados e sombras sutis; espaçamento generoso.
- Lista de amigos com avatares, nome, estado online (se disponível futuramente) e seleção destacada.
- Chat com balões arredondados, agrupamento por remetente e timestamps discretos; área de input fixa com botão destacado.
- Aba “Convites” com cards de convite, ações claras (Aceitar/Recusar) e feedback imediato.
- Aba “Adicionar” com campo de busca com ícone, resultados com avatar e CTA visível.
- Paleta: fundo cinza escuro atual, acento `#e2b714`, tons neutros para texto; foco/hover acessíveis.

## Ícone de Notificação no Header
1. Posição e apresentação
   - Adicionar um ícone de sino ao lado do nome/avatares no Header (`src/components/Header.tsx:103-114`).
   - Badge numérico vermelho mostrando a soma de não lidas.
2. Contadores
   - Convites: `friend_requests` com `recipient_id = user.id` e `status = 'pending'` usando `count: 'exact'` (head).
   - Mensagens: `direct_messages` com `recipient_id = user.id` e `read_at IS NULL`.
3. Tempo real
   - Assinar `friend_requests` `INSERT` (filtro para `recipient_id`) e `direct_messages` `INSERT` (filtro para `recipient_id`).
   - Atualizar contadores sem reload.
4. Interação rápida
   - Ao clicar, abrir dropdown com duas ações:
     - “Convites (N)”: navegar para `/friends?tab=invites`.
     - “Mensagens (M)”: navegar para `/friends?tab=friends`.
   - Opcional (se aprovado): listar últimos 5 convites/mensagens com ações rápidas (Aceitar/Recusar; abrir conversa).

## Melhorias de Navegação
- Suporte a parâmetros na tela Amigos:
  - `tab=friends|invites|add` para abrir diretamente a aba.
  - `select=<friend_id>` para pré-selecionar um amigo e abrir o chat.

## Verificação
- Fluxos manuais:
  - Receber convite: badge incrementa, aba “Convites” atualiza em tempo real; aceitar remove da lista e atualiza amigos corretamente (bug corrigido).
  - Receber mensagem: badge incrementa; abrir chat marca mensagens como lidas e badge decrementa.
  - Busca e envio de convite na aba “Adicionar” com estados de carregamento e prevenção de duplicidade.
- Testes de integração leves (se houver framework): simular inserts e verificar contadores/estado.

## Entregáveis
- Código corrigido em `FriendsPage` e `Header` com novas assinaturas e contadores.
- UI atualizada com classes e pequenos componentes reutilizáveis (itens de lista, balões de chat, dropdown de notificações).
- Sem mudanças de esquema no banco; reutiliza `read_at` existente em `direct_messages` e políticas RLS.

## Observação de Segurança
- Manter RLS do Supabase: filtros por `recipient_id` e `pair_key`; evitar exposição de dados de outros usuários.

Confirma realizar as alterações acima? Após confirmação, implemento, valido em execução local e apresento os resultados.