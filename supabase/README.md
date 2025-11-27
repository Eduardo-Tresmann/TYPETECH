# Scripts SQL do Banco de Dados - TypeTech

Este diretório contém todos os scripts SQL necessários para configurar o banco de dados do TypeTech. Os arquivos estão organizados em ordem de execução e devem ser executados sequencialmente.

## 📋 Ordem de Execução

Execute os arquivos na seguinte ordem:

### 1. `01_init.sql` ⚙️
**Propósito:** Inicialização de extensões PostgreSQL necessárias
- Habilita extensão `pgcrypto` para geração de UUIDs aleatórios
- **DEVE SER EXECUTADO PRIMEIRO**

### 2. `02_profiles.sql` 👤
**Propósito:** Tabela de perfis de usuário
- Cria tabela `profiles` com nome de exibição e avatar
- Configura índices, constraints e Row Level Security (RLS)
- **Dependências:** `01_init.sql`

### 3. `03_profiles_bootstrap.sql` 🔄
**Propósito:** Criação automática de perfis
- Trigger que cria perfil automaticamente quando usuário se registra
- Migração para usuários existentes sem perfil
- **Dependências:** `02_profiles.sql`

### 4. `04_friends.sql` 👥
**Propósito:** Tabela de amizades
- Armazena relacionamentos de amizade entre usuários
- Estrutura bidirecional (user_a < user_b) para evitar duplicatas
- **Dependências:** `01_init.sql`

### 5. `05_friend_requests.sql` 📨
**Propósito:** Tabela de solicitações de amizade
- Gerencia estados: pending, accepted, rejected, cancelled
- Função auxiliar `accept_friend_request()` para aceitar solicitações
- **Dependências:** `01_init.sql`, `04_friends.sql`

### 6. `06_direct_messages.sql` 💬
**Propósito:** Tabela de mensagens diretas
- Armazena mensagens privadas entre dois usuários
- Usa `pair_key` para agrupar mensagens de uma conversa
- **Dependências:** `01_init.sql`

### 7. `07_typing_results.sql` ⌨️
**Propósito:** Tabela de resultados de digitação
- Armazena resultados de testes (15/30/60/120 segundos)
- Métricas: WPM, precisão, acertos, erros
- **Dependências:** `01_init.sql`

### 8. `08_notifications.sql` 🔔
**Propósito:** Tabela de notificações
- Armazena notificações de: solicitações de amizade, mensagens, recordes superados
- Suporta metadata JSON para dados extras
- **Dependências:** `01_init.sql`

### 9. `09_notification_triggers.sql` ⚡
**Propósito:** Triggers automáticos de notificações
- Cria notificações quando solicitação de amizade é enviada
- Cria notificações quando mensagem é recebida
- Limpa notificações quando solicitação é resolvida
- **Dependências:** `08_notifications.sql`, `05_friend_requests.sql`, `06_direct_messages.sql`

### 10. `10_storage_avatars.sql` 🖼️
**Propósito:** Configuração de storage para avatares
- Cria bucket público `avatars` no Supabase Storage
- Configura políticas de leitura/escrita
- **Dependências:** Supabase Storage habilitado

### 11. `11_user_basic.sql` 🔍
**Propósito:** Função auxiliar para buscar usuário
- Retorna informações básicas (ID, nome, avatar)
- Combina dados de `auth.users` e `profiles`
- **Dependências:** `02_profiles.sql`

### 12. `12_search_profiles.sql` 🔎
**Propósito:** Função de busca por similaridade
- Busca perfis por nome de exibição usando trigram matching
- Habilita extensão `pg_trgm` automaticamente
- **Dependências:** `02_profiles.sql`

### 13. `13_search_users.sql` 🔎
**Propósito:** Função de busca por nome ou email
- Busca usuários por nome de exibição ou email
- Combina dados de `auth.users` e `profiles`
- **Dependências:** `02_profiles.sql`

### 14. `14_check_record_beaten.sql` 🏆
**Propósito:** Trigger para verificar recordes superados
- Verifica se novo resultado supera recordes de amigos
- Cria notificações automaticamente
- **Dependências:** `07_typing_results.sql`, `04_friends.sql`, `08_notifications.sql`

### 15. `15_leaderboard_view.sql` 🏅
**Propósito:** Exposição segura para leaderboards
- Cria a view `leaderboard_verified_view` apenas com resultados auditados
- Define a função `leaderboard_for_time` (security definer) usada pelo frontend
- **Dependências:** `07_typing_results.sql`, `02_profiles.sql`

### 16. `16_typing_results_audit.sql` 🔍
**Propósito:** Auditoria e limpeza pós-incidente
- Cria a tabela `typing_results_audit_log`
- Define a função `flag_suspicious_typing_results` para invalidar resultados irreais
- **Dependências:** `07_typing_results.sql`
- **DEVE SER EXECUTADO POR ÚLTIMO**

## 🗂️ Estrutura do Banco de Dados

### Tabelas Principais

1. **profiles** - Perfis de usuário (nome, avatar)
2. **friends** - Relacionamentos de amizade
3. **friend_requests** - Solicitações de amizade
4. **direct_messages** - Mensagens privadas
5. **typing_results** - Resultados de testes de digitação
6. **notifications** - Notificações do sistema
7. **typing_results_audit_log** - Histórico de auditorias de resultados

### Funções Auxiliares

- `user_basic(uuid)` - Buscar informações básicas de usuário
- `search_profiles(text, int)` - Buscar perfis por similaridade
- `search_users(text, int)` - Buscar usuários por nome/email
- `accept_friend_request(uuid)` - Aceitar solicitação de amizade
- `leaderboard_for_time(int, int)` - Fornece dados verificados para os leaderboards
- `flag_suspicious_typing_results(int, numeric)` - Marca resultados suspeitos como não verificados

### Triggers

- `on_auth_users_create_profile` - Cria perfil automaticamente
- `friend_requests_notification_trigger` - Notifica solicitação de amizade
- `direct_messages_notification_trigger` - Notifica mensagem recebida
- `friend_requests_cleanup_notification_trigger` - Limpa notificações resolvidas
- `typing_results_record_beaten_trigger` - Verifica recordes superados
- Auditoria manual adicional através de `flag_suspicious_typing_results`

## 🔒 Segurança

Todos os scripts implementam **Row Level Security (RLS)** para proteger os dados:

- Usuários só podem ver/editar seus próprios dados
- Políticas específicas para cada operação (SELECT, INSERT, UPDATE, DELETE)
- Funções com `security definer` para operações do sistema

## 📝 Notas Importantes

1. **Ordem é crítica:** Execute os arquivos na ordem especificada
2. **Extensões:** `pgcrypto` e `pg_trgm` são habilitadas automaticamente
3. **Storage:** Certifique-se de que o Supabase Storage está habilitado antes de executar `10_storage_avatars.sql`
4. **Migração:** `03_profiles_bootstrap.sql` inclui migração para usuários existentes

## 🚀 Execução Rápida

Para executar todos os scripts em ordem no Supabase SQL Editor:

```sql
-- Execute cada arquivo na ordem numerada acima
-- Ou use um script de migração que execute todos sequencialmente
```

## 🔄 Atualizações

Ao atualizar os scripts:
1. Verifique as dependências entre arquivos
2. Teste em ambiente de desenvolvimento primeiro
3. Faça backup do banco antes de aplicar mudanças em produção

