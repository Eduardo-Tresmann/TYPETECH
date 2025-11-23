# Configuração do Sistema de Notificações no Supabase

Siga estes passos na ordem para configurar o sistema de notificações:

## Passo 1: Criar a Tabela de Notificações

1. Acesse o **Supabase Dashboard** → Seu projeto
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Copie e cole o conteúdo completo do arquivo `supabase/notifications.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Verifique se apareceu "Success. No rows returned"

## Passo 2: Criar os Triggers de Notificações

1. No mesmo **SQL Editor**, crie uma nova query
2. Copie e cole o conteúdo completo do arquivo `supabase/notification_triggers.sql`
3. Clique em **Run**
4. Verifique se apareceu "Success. No rows returned"

## Passo 3: Criar a Função de Detecção de Recordes

1. No **SQL Editor**, crie uma nova query
2. Copie e cole o conteúdo completo do arquivo `supabase/check_record_beaten.sql`
3. Clique em **Run**
4. Verifique se apareceu "Success. No rows returned"

## Passo 4: Habilitar Realtime (Opcional mas Recomendado)

Para notificações em tempo real:

### Método 1: Via Dashboard (Mais Fácil)

1. No **Supabase Dashboard**, vá em **Database** (menu lateral esquerdo)
2. Clique em **Replication** (ou **Publications** em versões mais antigas)
3. Você verá uma lista de tabelas do seu banco de dados
4. Procure pela tabela `notifications` na lista
5. Clique no **toggle/switch** ao lado de `notifications` para ativar
6. O toggle deve ficar **verde/ativado**

**Nota:** Se não encontrar "Replication", procure por:
- **Database** → **Publications** → Ative a publicação para `notifications`
- Ou **Database** → **Tables** → Clique em `notifications` → Aba **Replication**

### Método 2: Via SQL (Alternativo)

Se não conseguir pelo dashboard, execute este SQL:

```sql
-- Habilitar Realtime para a tabela notifications
alter publication supabase_realtime add table notifications;
```

Execute no **SQL Editor** e verifique se apareceu "Success".

### Verificação

Após habilitar, as notificações aparecerão **instantaneamente** quando:
- Alguém enviar uma solicitação de amizade
- Alguém enviar uma mensagem  
- Um amigo superar seu recorde

Sem precisar recarregar a página!

## Verificação

Para verificar se tudo está funcionando:

1. Vá em **Table Editor** → **notifications**
2. Você deve ver a tabela criada com as colunas:
   - `id`, `user_id`, `type`, `related_id`, `related_user_id`, `metadata`, `read_at`, `created_at`

2. Vá em **Database** → **Functions**
3. Você deve ver as funções:
   - `create_friend_request_notification`
   - `create_message_notification`
   - `cleanup_friend_request_notifications`
   - `check_and_notify_record_beaten`

## Teste Rápido

Para testar se está funcionando:

1. Envie uma solicitação de amizade para outro usuário
2. Verifique se uma notificação foi criada na tabela `notifications`
3. Envie uma mensagem para um amigo
4. Verifique se uma notificação foi criada

## Troubleshooting

Se algo não funcionar:

1. Verifique se há erros no **SQL Editor** (aba de logs)
2. Verifique se as tabelas `friend_requests`, `direct_messages` e `typing_results` existem
3. Verifique se as policies de RLS estão corretas
4. Verifique os logs em **Logs** → **Postgres Logs` no dashboard

## Ordem de Execução Importante

Execute os scripts nesta ordem:
1. ✅ `notifications.sql` (primeiro - cria a tabela)
2. ✅ `notification_triggers.sql` (segundo - cria triggers)
3. ✅ `check_record_beaten.sql` (terceiro - cria função de recordes)

