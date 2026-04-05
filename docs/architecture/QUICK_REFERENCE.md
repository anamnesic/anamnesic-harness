# ⚡ Quick Reference - Guia Rápido de Desenvolvimento

## 🚀 Startup Rápido

```bash
# 1. Install & Start
cd backend && npm install && npm run dev

# 2. Em outro terminal
cd frontend && npm install && npm run dev

# 3. Abrir
Frontend: http://localhost:3000
GraphQL: http://localhost:4000/graphql
Health: http://localhost:4000/health
```

---

## 🔑 API Key Workflow Rápido

### 1. Gerar Chave (GraphQL Sandbox)

```graphql
mutation {
  generateApiKey(projectId: "PROJECT_UUID", name: "My Key") {
    key # COPIE AGORA - nunca volta!
    name
  }
}
```

### 2. Usar em Requests

```bash
curl -H "Authorization: Bearer YOUR_KEY" http://localhost:4000/graphql
```

### 3. Listar & Revogar

```graphql
# Listar
query {
  apiKeys(projectId: "PROJECT_UUID") {
    id
    name
    isActive
    lastUsed
  }
}

# Revogar
mutation {
  revokeApiKey(keyId: "KEY_UUID")
}
```

---

## 📝 Queries & Mutations Prontas

### Projects

```graphql
# Criar
mutation {
  createProject(name: "App", description: "...") {
    id
    name
  }
}

# Listar
query {
  projects {
    id
    name
    contextEntries {
      id
    }
    decisions {
      id
    }
  }
}

# Detalhe
query {
  project(id: "ID") {
    id
    name
    contextEntries {
      key
      value
      category
      priority
    }
    decisions {
      title
      description
    }
  }
}
```

### Context Entries

```graphql
# Criar
mutation {
  createContextEntry(
    projectId: "ID"
    key: "Tech Stack"
    value: "Node + React"
    category: "architecture"
    priority: 3
  ) {
    id
    key
    value
  }
}

# Listar
query {
  contextEntries(projectId: "ID", category: "architecture") {
    id
    key
    value
    priority
    createdAt
  }
}

# Atualizar
mutation {
  updateContextEntry(id: "ID", value: "Node + React + GraphQL", priority: 4) {
    id
    value
  }
}
```

### Decisions

```graphql
# Criar
mutation {
  createDecision(
    projectId: "ID"
    title: "Use PostgreSQL"
    description: "Reasoning..."
  ) {
    id
    title
  }
}

# Listar
query {
  decisions(projectId: "ID") {
    id
    title
    description
    status
    createdAt
  }
}

# Atualizar
mutation {
  updateDecision(id: "ID", status: "deprecated") {
    id
    status
  }
}
```

---

## 🧪 Testar Rate Limiting

```bash
# Script para testar 61 requests em 60 segundos
for i in {1..61}; do
  curl -s http://localhost:4000/graphql \
    -H "Authorization: Bearer YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"query":"query { projects { id } }"}' | grep -o "rate\|ok" &
done
wait

# Resultado esperado: últimas requisições devem ser 429
```

---

## 🔍 Debug Tips

### GraphQL Errors

```graphql
# Teste simples no Sandbox
query {
  projects {
    id
  }
}

# Se retornar [], está OK (lista vazia)
# Se retornar erro, leia a mensagem!
```

### Authentication Issues

```bash
# ❌ Invalid API Key
curl -H "Authorization: Bearer WRONG" http://localhost:4000/graphql
# Status: 401 Unauthorized

# ✅ Correto
curl -H "Authorization: Bearer CORRECT_KEY" http://localhost:4000/graphql
# Retorna resultado
```

### Database Issues

```bash
# Reset local database
rm database.sqlite
npm run dev  # Recria automaticamente
```

---

## 📦 Dependências Principais

### Backend

```json
{
  "@apollo/server": "GraphQL API",
  "express": "Web framework",
  "typeorm": "ORM Database",
  "zod": "Schema validation",
  "express-rate-limit": "Rate limiting",
  "sqlite3": "Dev database"
}
```

### Frontend

```json
{
  "react": "UI Library",
  "@apollo/client": "GraphQL client",
  "tailwindcss": "Styling",
  "typescript": "Type safety"
}
```

---

## 🏗️ Estrutura de Pastas

```
backend/src/
├── entities/           # TypeORM models
├── graphql/           # Schema + resolvers
├── middleware/        # Auth, rate limit
├── validation/        # Zod schemas
├── utils/            # Helpers, crypto
├── data-source.ts    # DB config
└── index.ts          # Server entry

frontend/src/
├── components/       # React components
├── graphql/         # Queries
├── App.tsx          # Main
├── index.tsx        # ReactDOM
└── index.css        # Styles
```

---

## 🔧 Comandos Úteis

```bash
# Backend
npm run dev              # Start with auto-reload
npm run build           # Compile TypeScript
npm start               # Run compiled JS
npm test                # Run tests

# Frontend
npm run dev             # Vite dev server
npm run build           # Build for production
npm run preview         # Preview build

# Database
rm database.sqlite      # Reset DB
```

---

## 📋 Checklist: Adicionar Nova Feature

```
1. ✅ Criar entidade TypeORM em backend/src/entities/
2. ✅ Adicionar ao AppDataSource em data-source.ts
3. ✅ Criar schema GraphQL em graphql/schema.ts
4. ✅ Criar resolver em graphql/resolvers.ts
5. ✅ Adicionar validação em validation/schemas.ts
6. ✅ (Frontend) Criar Query/Mutation hooks
7. ✅ (Frontend) Criar React component
8. ✅ Testar em GraphQL Sandbox
9. ✅ Testar UX no frontend
10. ✅ Add ao PROJECT_SUMMARY.md
```

---

## 🚨 Common Issues & Fixes

| Problema                                   | Solução                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `ENOENT: no such file or directory`        | Certifique que você está no diretório certo       |
| `Cannot find module '@apollo/server'`      | `npm install` na pasta backend                    |
| `Port 4000 already in use`                 | Mude para outra porta em `.env`                   |
| `GraphQL CORS error`                       | Verificar CORS origin em `index.ts`               |
| `"Cannot set headers after they are sent"` | Middleware ordem incorreta                        |
| `API Key not working`                      | Formato correto: `Authorization: Bearer KEY_HERE` |

---

## 🎯 Performance Tips

```typescript
// ✅ BOM - Batch queries
query {
  projects { id }
  decisions { id }
  apiKeys { id }  # Tudo em 1 request
}

// ❌ RUIM - Múltiplos requests
query { projects { id } }
query { decisions { id } }
query { apiKeys { id } }  # 3 requests
```

---

## 📚 Documentação Rápida

| Doc                         | Propósito          |
| --------------------------- | ------------------ |
| `API_AUTHENTICATION.md`     | Como usar API Keys |
| `GETTING_STARTED.md`        | Setup inicial      |
| `ARCHITECTURE.md`           | Design do sistema  |
| `STATUS.md`                 | Status atual       |
| `IMPLEMENTATION_SUMMARY.md` | O que foi feito    |
| `Este arquivo`              | Referência rápida  |

---

## 🔗 Recursos Externos

- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [TypeORM Docs](https://typeorm.io/)
- [Zod Docs](https://zod.dev/)
- [React Docs](https://react.dev/)
- [GraphQL Docs](https://graphql.org/learn/)

---

## 💡 Dicas Pro

1. **Sempre test no GraphQL Sandbox first** - evita bugs de frontend
2. **Use variáveis em GraphQL queries** - mais seguro
3. **Commit após cada feature** - fácil rollback
4. **Documenta mudanças no schema** - importante para equipes
5. **Monitore rate limits** - ative logs em produção

---

## 📞 Quando precisar...

**Gerar nova API Key**: Mutation `generateApiKey`  
**Integrar com Copilot**: Veja `integrations/github-copilot.md`  
**Debugar erro GraphQL**: Ative `includeStacktraceInErrorResponses` em dev  
**Fazer query complexa**: Use DataLoader (não implementado ainda)  
**Deployar em produção**: Veja `DEPLOYMENT.md`

---

**Última atualização**: 05/04/2026  
**Status**: ✅ Ready to develop  
**Next step**: Escolha seu próximo task! 🚀
