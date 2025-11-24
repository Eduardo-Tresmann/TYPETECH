# Guia de Contribuição

Este documento fornece diretrizes para contribuir com o projeto TypeTech.

## Instalação

### Pré-requisitos

- Node.js 18+ e npm
- Git

### Passos

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd TypeTech
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione as variáveis necessárias (consulte `.env.example` se disponível)

## Como Rodar

### Desenvolvimento

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

### Build

Para criar uma build de produção:

```bash
npm run build
```

### Iniciar Produção

Para iniciar o servidor de produção (após o build):

```bash
npm start
```

### Linting e Formatação

Para verificar problemas de lint:

```bash
npm run lint
```

Para corrigir automaticamente problemas de lint:

```bash
npm run lint:fix
```

Para formatar o código:

```bash
npm run format
```

Para verificar se o código está formatado:

```bash
npm run format:check
```

## Padrão de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/) para manter um histórico de commits consistente e facilitar a geração automática de changelogs.

### Formato

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração de código (sem mudança de funcionalidade)
- `style`: Mudanças de formatação (espaços, vírgulas, etc.)
- `docs`: Mudanças na documentação
- `test`: Adição ou correção de testes
- `chore`: Tarefas de manutenção (dependências, configurações, etc.)
- `perf`: Melhorias de performance
- `ci`: Mudanças em CI/CD
- `build`: Mudanças no sistema de build

### Exemplos

```
feat(friends): adicionar busca de usuários

Permite buscar usuários por nome para adicionar como amigos.

Closes #123
```

```
fix(auth): corrigir validação de email

Corrige regex que não aceitava emails com subdomínios.
```

```
refactor(profile): extrair lógica de upload para serviço

Move a lógica de upload de avatar para AvatarService para melhorar
a organização do código.
```

```
docs: atualizar README com instruções de instalação
```

## Estrutura de Branches

### Branches Principais

- `main`: Branch de produção. Código estável e testado.
- `develop`: Branch de desenvolvimento. Código em desenvolvimento que será integrado na próxima release.

### Branches de Feature

Para novas funcionalidades:

```
feature/nome-da-feature
```

Exemplo:
```
feature/notificacoes-push
```

### Branches de Fix

Para correções de bugs:

```
fix/nome-do-fix
```

Exemplo:
```
fix/validacao-email
```

### Branches de Refactor

Para refatorações:

```
refactor/nome-do-refactor
```

Exemplo:
```
refactor/estrutura-servicos
```

### Workflow

1. Crie uma branch a partir de `develop`:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/minha-feature
```

2. Faça suas alterações e commits seguindo o padrão de commits

3. Envie a branch para o repositório:
```bash
git push origin feature/minha-feature
```

4. Abra um Pull Request para `develop`

5. Após revisão e aprovação, o PR será mergeado em `develop`

6. Quando estiver pronto para release, `develop` será mergeado em `main`

## Código de Conduta

- Seja respeitoso e profissional
- Aceite feedback construtivo
- Ajude outros contribuidores quando possível
- Mantenha o código limpo e bem documentado

## Dúvidas?

Se tiver dúvidas sobre como contribuir, abra uma issue ou entre em contato com os mantenedores do projeto.

