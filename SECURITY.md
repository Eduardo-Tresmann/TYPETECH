# Guia de Segurança - TypeTech

Este documento descreve as medidas de segurança implementadas no projeto TypeTech.

## Proteção de Dados Sensíveis

### Supabase Row Level Security (RLS)

Todas as tabelas principais têm RLS habilitado:

- **`typing_results`**: Usuários só podem inserir seus próprios resultados
- **`profiles`**: Usuários só podem atualizar seus próprios perfis
- **`direct_messages`**: Mensagens são protegidas por políticas de acesso
- **`friends`** e **`friend_requests`**: Apenas usuários envolvidos podem acessar

### Variáveis de Ambiente

Nunca exponha chaves secretas no frontend:
- `NEXT_PUBLIC_SUPABASE_URL`: Pode ser pública (URL do projeto)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Pode ser pública (chave anônima)
- Chaves de serviço (`service_role_key`) nunca devem estar no frontend

## Validação de Entrada

### Email
- Validação com regex rigoroso
- Normalização (trim + lowercase)
- Verificação de formato antes de enviar ao Supabase

### Nome de Exibição
- Entre 3 e 24 caracteres
- Apenas letras, números, espaços e alguns caracteres especiais
- Sanitização de caracteres perigosos
- Verificação de duplicatas no banco

### Senha
- Mínimo 6 caracteres (requisito do Supabase)
- Validação opcional de força (8+ caracteres, mix de tipos)
- Nunca armazenada em texto plano (Supabase Auth gerencia)

### Mensagens de Chat
- Limite de 5000 caracteres
- Sanitização de HTML e scripts
- Remoção de event handlers (onclick, onerror, etc)
- Validação de conteúdo antes de salvar

### Resultados de Digitação
- Validação de valores numéricos
- Verificação de ranges válidos (WPM: 0-1000, Accuracy: 0-100)
- Duração limitada a valores permitidos (15, 30, 60, 120 segundos)

### Upload de Arquivos
- Validação de tipo MIME (apenas imagens)
- Limite de tamanho (5MB)
- Sanitização de nome de arquivo
- Validação de URL de avatar (apenas HTTPS, domínios confiáveis)

## Proteção XSS (Cross-Site Scripting)

### Componente SafeText
- Componente `SafeText` que escapa HTML automaticamente
- Uso de `escapeHtml()` para sanitizar strings
- Nunca use `dangerouslySetInnerHTML` sem sanitização

### Renderização Segura
- Mensagens de chat são renderizadas como texto puro
- Quebras de linha são tratadas com `<br />` ao invés de HTML
- Nomes de usuário são sempre escapados

## Rate Limiting

Limites implementados para prevenir abuso:

- **Login**: 5 tentativas por 15 minutos
- **Registro**: 3 tentativas por hora
- **Mensagens de chat**: 30 por minuto
- **Salvamento de resultados**: 100 por hora
- **Atualização de perfil**: 10 por hora

Os rate limiters são baseados em localStorage (client-side). Para produção, considere implementar rate limiting no backend.

## Políticas de Segurança do Supabase

### RLS Policies

#### typing_results
```sql
-- Inserção: apenas próprio usuário
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id)

-- Leitura: pública (para leaderboards)
FOR SELECT USING (true)
```

#### profiles
```sql
-- Leitura: pública
FOR SELECT USING (true)

-- Inserção/Atualização: apenas próprio perfil
FOR INSERT/UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id)
```

### Constraints de Banco

- `typing_results.total_time`: Apenas valores 15, 30, 60, 120
- `typing_results.wpm`: >= 0
- `typing_results.accuracy`: Entre 0 e 100
- `profiles.display_name`: Entre 3 e 24 caracteres, único (case-insensitive)

## Boas Práticas Implementadas

1. **Validação Dupla**: Validação no frontend (UX) e no backend (segurança)
2. **Sanitização**: Todos os inputs são sanitizados antes de processamento
3. **Rate Limiting**: Prevenção de abuso e ataques de força bruta
4. **HTTPS Only**: URLs de avatar devem ser HTTPS
5. **Content Security Policy**: Considere adicionar headers CSP no Next.js
6. **Logging**: Erros são logados sem expor informações sensíveis

## Recomendações para Produção

1. **Backend Rate Limiting**: Implemente rate limiting no backend (Redis, etc)
2. **CSP Headers**: Configure Content Security Policy no Next.js
3. **HTTPS Enforced**: Force HTTPS em todas as requisições
4. **Audit Logs**: Implemente logs de auditoria para ações sensíveis
5. **2FA**: Considere adicionar autenticação de dois fatores
6. **Session Management**: Configure timeout de sessão adequado
7. **CORS**: Configure CORS adequadamente se usar APIs externas
8. **Dependency Updates**: Mantenha dependências atualizadas

## Checklist de Segurança

- [x] RLS habilitado em todas as tabelas
- [x] Validação de entrada implementada
- [x] Sanitização de strings
- [x] Proteção XSS
- [x] Rate limiting básico
- [x] Validação de arquivos
- [x] Validação de URLs
- [ ] CSP headers (recomendado)
- [ ] Backend rate limiting (recomendado)
- [ ] Audit logs (recomendado)

## Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade de segurança, por favor:
1. Não divulgue publicamente
2. Entre em contato com os mantenedores
3. Forneça detalhes suficientes para reprodução
4. Aguarde confirmação antes de divulgar

