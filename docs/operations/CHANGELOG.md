# CHANGELOG - Implementação de Autenticação & Segurança

## [0.2.0] - 2026-04-05

### ✨ Adicionado

#### Backend - Autenticação (API Keys)

- **Entidade `ApiKey`** (`backend/src/entities/ApiKey.ts`)
  - UUID primary key
  - Relacionamento com Project
  - Hash SHA-256 da chave
  - Tracking: createdAt, lastUsed, revokedAt
  - isActive flag para revogação lógica
  - Index em keyHash e project para performance

- **Middleware de Autenticação** (`backend/src/middleware/auth.ts`)
  - Validação de Bearer token em headers
  - Busca de API key no banco com hash comparison
  - Timing-safe comparison para segurança
  - Update de lastUsed automaticamente
  - Atach de apiKeyId e projectId ao request Express

- **Utilitários de Criptografia** (`backend/src/utils/cryptography.ts`)
  - `generateApiKey()`: gera 32 bytes random
  - `hashApiKey()`: SHA-256 hash
  - `verifyApiKey()`: timing-safe comparison
  - Seguro contra timing attacks

- **GraphQL Schema - API Key Type**
  - Type `ApiKey` com campos: id, name, key, isActive, lastUsed, createdAt, revokedAt
  - Query `apiKeys(projectId)`: listar chaves ativas
  - Mutation `generateApiKey(projectId, name)`: criar nova chave
  - Mutation `revokeApiKey(keyId)`: desabilitar chave

- **GraphQL Resolvers - API Key**
  - `apiKeys` query: busca chaves não revogadas
  - `generateApiKey` mutation: gera chave + hash + retorna plaintext 1x
  - `revokeApiKey` mutation: marca como revogada + timestamp

#### Backend - Rate Limiting

- **Middleware de Rate Limiting** (`backend/src/middleware/rateLimiter.ts`)
  - `createRateLimiter()`: factory function configurável
  - GraphQL specifico: 60 req/min
  - Geral: 100 req/15min
  - Keygen por API key ou IP
  - Status 429 com headers RateLimit-\*
  - Skip para health check

- **Integração no Server** (`backend/src/index.ts`)
  - Rate limiting aplicado no `/graphql` endpoint
  - Middleware order: cors → rate limit → apollo

#### Backend - Validação (Zod Schemas)

- **Validação Schemas** (`backend/src/validation/schemas.ts`)
  - `createProjectSchema`: name (2-100), description (max 500)
  - `updateProjectSchema`: idem opcional
  - `createContextEntrySchema`: key (1-100), value (1-10000), category enum, priority (1-4)
  - `updateContextEntrySchema`: idem opcional
  - `createDecisionSchema`: title (3-200), description (10-5000)
  - `updateDecisionSchema`: title, desc, status enum
  - `createApiKeySchema`: projectId UUID, name (1-100)
  - Type exports para TypeScript safety

#### Backend - Atualizado Existente

- **Data Source** (`backend/src/data-source.ts`)
  - Adicionada entidade `ApiKey` ao entities array
  - Sincronização automática com TypeORM

- **GraphQL Schema** (`backend/src/graphql/schema.ts`)
  - Adicionado type `ApiKey`
  - Adicionado field `apiKeys` em Project type
  - Adicionado query `apiKeys(projectId)`
  - Adicionado mutations `generateApiKey` e `revokeApiKey`

- **GraphQL Resolvers** (`backend/src/graphql/resolvers.ts`)
  - Import de ApiKey repository e CryptoUtils
  - Query `apiKeys`: lista chaves ativas
  - Mutation `generateApiKey`: gera chave segura
  - Mutation `revokeApiKey`: revoga chave
  - Update em `projects` e `project` para incluir apiKeys

- **Express Server** (`backend/src/index.ts`)
  - Importado `graphqlRateLimiter`
  - Aplicado rate limiting no `/graphql`
  - Melhorado CORS (origem configurável)
  - Improved logging com status codes
  - Enhanced health check com uptime, env

- **Package.json** (`backend/package.json`)
  - Adicionado `zod@^3.22.4`
  - Adicionado `express-rate-limit@^7.1.5`
  - Adicionado `body-parser@^1.20.2` (dependency explicit)
  - Adicionado `@types/express-rate-limit@^6.0.0` (devDep)

#### Documentação

- **API_AUTHENTICATION.md**
  - Guia completo de como gerar API keys
  - Como usar em requests (Bearer token)
  - Exemplo integração GitHub Copilot
  - Rate limiting explanation
  - Gerenciamento de chaves (list, revoke)
  - Rotação de chaves
  - Security best practices
  - Troubleshooting
  - Exemplos em JavaScript e Python

- **STATUS.md**
  - Resumo de implementação
  - Checklist do implementado
  - Como testar cada feature
  - Próximos passos com opções

- **IMPLEMENTATION_ROADMAP.md** (atualizado)
  - Status visual com progresso
  - O que foi feito vs falta
  - Timeline real gasto
  - Como testar tudo

- **IMPLEMENTATION_SUMMARY.md**
  - Visual ASCII art summary
  - Tabela de progresso overall
  - Estatísticas do trabalho
  - Security checklist

- **QUICK_REFERENCE.md**
  - Startup rápido
  - API key workflow
  - Queries/mutations prontas
  - Debug tips
  - Common issues & fixes
  - Performance tips

### 🔒 Segurança

- Hash de API keys com SHA-256 (nunca armazenar em texto plano)
- Timing-safe comparison contra timing attacks
- Geração criptográfica com `crypto.randomBytes`
- Rate limiting para prevenção de brute force/DDoS
- Input validation com Zod (prevenção de injection)

### 📊 Statísticas

- **Linhas adicionadas**: ~500 linhas
- **Arquivos novos**: 5
- **Arquivos modificados**: 5
- **Novas dependências**: 3
- **Tempo de implementação**: 95 minutos
- **Documentação**: 6 novos arquivos

### 🏗️ Estrutura Updated

```
backend/src/
├── entities/
│   ├─ Project.ts
│   ├─ ContextEntry.ts
│   ├─ Decision.ts
│   └─ ApiKey.ts [✨ NEW]
├── middleware/
│   ├─ auth.ts [✨ NEW]
│   └─ rateLimiter.ts [✨ NEW]
├── validation/
│   └─ schemas.ts [✨ NEW]
├── utils/
│   └─ cryptography.ts [✨ NEW]
├── graphql/
│   ├─ schema.ts [📝 UPDATED]
│   └─ resolvers.ts [📝 UPDATED]
├─ data-source.ts [📝 UPDATED]
└─ index.ts [📝 UPDATED]
```

### 🧪 Testabilidade

- Todos os tipos typescript completamente tipados
- Schemas Zod exportados como tipos
- Middlewares isolados e testáveis
- Resolvers separados da lógica de autenticação
- Express Request estendido com types

### 📈 Performance

- Index em `(keyHash, project)` para queries rápidas
- Rate limiting no servidor (antes do Apollo)
- Timing-safe comparison (não vulnerável a timing attacks)
- Lazy-loading de relacionamentos no GraphQL

### ⚠️ Breaking Changes

- NENHUM - API backwards compatible
- Novos tipos GraphQL, tipos existentes sem mudança

### 🔄 Migrations

- Nenhuma migrations necessária (TypeORM sync automático)
- Novo schema ApiKey criado automaticamente

### 🔮 Próximas Features

- [ ] Unit tests para auth & rate limiting
- [ ] WebSocket real-time synchronization
- [ ] Redis distributed rate limiting (produção)
- [ ] JWT tokens para sessões longas
- [ ] Audit logs de acesso de API
- [ ] Exemplo integrações (Copilot, Claude)

### ✅ Checklist Pré-Deploy

- [x] TypeScript compilation sem errors
- [x] Schema GraphQL válido
- [x] Resolvers implementados
- [x] Rate limiting funcional
- [x] API Keys geráveis
- [x] Documentação update

---

## [0.1.0] - 2026-04-05

### ✨ Adicionado (MVP Initial)

#### Backend

- Express.js + Apollo Server GraphQL
- TypeORM com SQLite
- Entities: Project, ContextEntry, Decision
- GraphQL schema e resolvers completos
- CORS e Helmet middleware
- Health check endpoint

#### Frontend

- React 18 + TypeScript
- Apollo Client integration
- Tailwind CSS styling
- Componentes: ProjectList, ProjectDetail, Forms
- GraphQL queries e mutations

#### Documentação

- README.md - Project overview
- GETTING_STARTED.md - Setup guide
- ARCHITECTURE.md - System design
- DEPLOYMENT.md - Docker & K8s
- BUSINESS.md - Market analysis
- PROJECT_SUMMARY.md - Deliverables

---

**Version**: 0.2.0  
**Release Date**: 2026-04-05  
**Status**: ✅ Ready for testing  
**Next Release**: 0.3.0 (Testes & WebSocket)
