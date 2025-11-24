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

### Configuração

O projeto requer variáveis de ambiente para funcionar corretamente. Siga estes passos:

1. **Copie o arquivo de exemplo:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure as variáveis necessárias:**
   - Abra o arquivo `.env.local` (ou `.env` em desenvolvimento)
   - Preencha os valores reais das variáveis

3. **Variáveis disponíveis:**
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase (obrigatória)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima do Supabase (obrigatória)
   - `NEXT_PUBLIC_SITE_URL`: URL do site para redirecionamentos (opcional)
   - `NEXT_PUBLIC_AVATARS_BUCKET`: Nome do bucket de avatares (opcional, padrão: 'avatars')

### Boas Práticas

**⚠️ IMPORTANTE - Segurança de Variáveis:**

- **NUNCA** exponha chaves secretas no frontend
- Variáveis com prefixo `NEXT_PUBLIC_*` são expostas ao cliente (browser)
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` podem ser públicas (são chaves anônimas)
- **Chaves de serviço** (`service_role_key`) **NUNCA** devem estar em variáveis `NEXT_PUBLIC_*`
- Chaves de serviço devem ser usadas apenas em APIs server-side (Route Handlers do Next.js)
- **NUNCA** commite arquivos `.env` ou `.env.local` no repositório
- Use `.env.example` como template (sem valores reais)
- Em produção, configure variáveis de ambiente através da plataforma de hospedagem

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
- Sanitização aplicada em todos os pontos de entrada

### Busca de Usuários
- Sanitização de queries de busca
- Remoção de caracteres perigosos
- Validação de entrada antes de consultar banco de dados
- Proteção contra injeção SQL (usando parâmetros preparados do Supabase)

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
7. **Auditoria de Dependências**: Scripts npm para verificar vulnerabilidades

## Boas Práticas de Desenvolvimento Seguro

### Para Desenvolvedores

1. **Sempre sanitize entradas do usuário:**
   - Use as funções de sanitização em `src/utils/validation.ts`
   - Nunca confie em dados do cliente
   - Valide e sanitize antes de processar

2. **Proteja dados sensíveis:**
   - Nunca commite chaves, senhas ou tokens
   - Use variáveis de ambiente para configurações sensíveis
   - Verifique `.gitignore` antes de commitar

3. **Mantenha dependências atualizadas:**
   ```bash
   npm audit          # Verificar vulnerabilidades
   npm audit --fix    # Corrigir automaticamente
   npm update         # Atualizar dependências
   ```

4. **Valide no frontend E backend:**
   - Validação no frontend melhora UX
   - Validação no backend é obrigatória para segurança
   - Nunca confie apenas na validação do frontend

5. **Use parâmetros preparados:**
   - O Supabase usa parâmetros preparados automaticamente
   - Nunca construa queries SQL manualmente com strings

6. **Implemente rate limiting:**
   - Previne abuso e ataques de força bruta
   - Use os rate limiters em `src/utils/security.ts`

7. **Escape dados ao renderizar:**
   - Use o componente `SafeText` para renderizar texto
   - Nunca use `dangerouslySetInnerHTML` sem sanitização
   - Escape HTML em todos os dados do usuário

8. **Revise código antes de commitar:**
   - Verifique se há dados sensíveis
   - Confirme que sanitização está aplicada
   - Execute `npm audit` antes de fazer push

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

### Implementado

- [x] RLS habilitado em todas as tabelas
- [x] Validação de entrada implementada
- [x] Sanitização de strings em todos os pontos de entrada
- [x] Proteção XSS
- [x] Rate limiting básico (client-side)
- [x] Validação de arquivos
- [x] Validação de URLs
- [x] Sanitização de queries de busca
- [x] Arquivo `.env.example` criado
- [x] Scripts de auditoria de dependências (`npm audit`)

### Recomendado para Produção

- [ ] CSP headers (Content Security Policy)
- [ ] Backend rate limiting (server-side)
- [ ] Audit logs (logs de auditoria)
- [ ] Monitoramento de segurança
- [ ] Testes de segurança automatizados
- [ ] Backup e recuperação de desastres
- [ ] Criptografia de dados sensíveis em trânsito e em repouso

## Auditoria de Dependências

### Verificar Vulnerabilidades

Execute regularmente para verificar vulnerabilidades nas dependências:

```bash
npm audit
```

### Corrigir Automaticamente

Para corrigir vulnerabilidades automaticamente (quando possível):

```bash
npm audit --fix
```

### Atualizar Dependências

Mantenha as dependências atualizadas:

```bash
npm update
```

### Recomendações

- Execute `npm audit` antes de cada deploy
- Configure CI/CD para executar auditoria automaticamente
- Revise vulnerabilidades críticas e altas imediatamente
- Mantenha um log de atualizações de dependências

## Reportar Vulnerabilidades

### Como Reportar

Se você descobrir uma vulnerabilidade de segurança, **NÃO** divulgue publicamente. Siga este processo:

1. **Não divulgue publicamente** - Evite criar issues públicas ou discutir em fóruns públicos
2. **Entre em contato com os mantenedores** - Envie um email ou mensagem privada
3. **Forneça detalhes suficientes:**
   - Descrição clara da vulnerabilidade
   - Passos para reproduzir o problema
   - Impacto potencial (baixo, médio, alto, crítico)
   - Possíveis soluções ou correções sugeridas
   - Versão do código afetada
4. **Aguarde confirmação** - Aguarde confirmação dos mantenedores antes de divulgar
5. **Tempo de resposta** - Os mantenedores se comprometem a responder em até 48 horas

### Política de Divulgação Responsável

- Vulnerabilidades críticas serão corrigidas o mais rápido possível
- Após a correção, será criado um aviso de segurança público
- Crédito será dado ao descobridor (se desejado)
- Não haverá ação legal contra pesquisadores que seguirem este processo

### O que NÃO Reportar

- Problemas de segurança que requerem acesso físico ao dispositivo
- Ataques de negação de serviço (DoS)
- Spam ou problemas de conteúdo
- Problemas de segurança de dependências de terceiros (reporte diretamente aos mantenedores)

