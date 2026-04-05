# API Key Authentication & Rate Limiting

## 🔐 Autenticação com API Key

### Como gerar uma API Key

1. **Via GraphQL Mutation**:

```graphql
mutation {
  generateApiKey(projectId: "seu-project-uuid", name: "Copilot Integration") {
    id
    key # IMPORTANTE: Copie essa chave agora (só aparece 1x)
    name
    createdAt
  }
}
```

2. **A resposta será algo como**:

```json
{
  "data": {
    "generateApiKey": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0",
      "name": "Copilot Integration",
      "createdAt": "2026-04-05T10:30:00Z"
    }
  }
}
```

**⚠️ IMPORTANTE**: Guarde essa chave em local seguro. Você não conseguirá recuperá-la depois!

### Como usar a API Key

Adicione o header `Authorization` em todas as requisições GraphQL:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { projects { id name } }"
  }'
```

### Exemplo: Integração com GitHub Copilot

```typescript
// Copilot integration code
const API_KEY = process.env.THINKCOFFEE_API_KEY;
const GRAPHQL_URL = "http://localhost:4000/graphql";

async function getProjectContext(projectId: string) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query {
          contextEntries(projectId: "${projectId}") {
            key
            value
            category
            priority
          }
        }
      `,
    }),
  });

  return await response.json();
}
```

## 🚦 Rate Limiting

### Limites Atuais

| Endpoint   | Limite          | Janela     |
| ---------- | --------------- | ---------- |
| `/graphql` | 60 requisições  | 1 minuto   |
| Geral      | 100 requisições | 15 minutos |

### O que acontece quando você excede o limite?

**Status HTTP**: `429 Too Many Requests`

**Resposta**:

```json
{
  "error": "Too many requests, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

**Headers de resposta**:

```
RateLimit-Limit: 60
RateLimit-Remaining: 0
RateLimit-Reset: 1712305260
```

### Boas Práticas

1. **Implemente retry com backoff exponencial**:

```typescript
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

2. **Monitore o header `RateLimit-Remaining`**:

```typescript
const response = await fetch(url, { headers });
const remaining = response.headers.get("RateLimit-Remaining");
if (remaining < 10) {
  console.warn("Approaching rate limit!");
}
```

3. **Implemente caching local**:

```typescript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getCachedContext(projectId) {
  const cached = cache.get(projectId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const data = await getProjectContext(projectId);
  cache.set(projectId, { data, time: Date.now() });
  return data;
}
```

## 🔑 Gerenciamento de API Keys

### Listar API Keys de um projeto

```graphql
query {
  apiKeys(projectId: "seu-project-uuid") {
    id
    name
    isActive
    lastUsed
    createdAt
    revokedAt
  }
}
```

### Revogar uma API Key

```graphql
mutation {
  revokeApiKey(keyId: "key-uuid") # Retorna true
}
```

### Rotação de Chaves

Segue o processo recomendado:

1. **Gere uma nova chave**:

```graphql
mutation {
  generateApiKey(projectId: "...", name: "Copilot Integration v2") {
    key
  }
}
```

2. **Atualize suas integrações** para usar a nova chave

3. **Revogue a chave antiga**:

```graphql
mutation {
  revokeApiKey(keyId: "old-key-id")
}
```

## 🔒 Segurança

### ⚡ O que é armazenado

- **Na API**: Hash SHA-256 da chave (não a chave em si)
- **No seu código**: A chave em variável de ambiente

### ⚡ O que NÃO é armazenado

- A chave em texto plano
- As requisições completam a chave

### ⚡ Boas práticas

```bash
# .env.local (NUNCA commit)
THINKCOFFEE_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...

# Acesso seguro
const apiKey = process.env.THINKCOFFEE_API_KEY;
if (!apiKey) {
  throw new Error('THINKCOFFEE_API_KEY not set');
}
```

## 📈 Monitoramento

### Verificar últimas chaves usadas

```graphql
query {
  apiKeys(projectId: "seu-project-uuid") {
    name
    lastUsed
    isActive
  }
}
```

### Detectar API Keys inativas

```bash
# Script para revogar chaves não usadas há 90 dias
# (implementar conforme necessário)
```

## 🆘 Troubleshooting

### "Invalid API key"

1. Copie novamente a chave (sem espaços)
2. Use o formato correto: `Bearer <key>`
3. Verifique se a chave não foi revogada

### "Too many requests"

1. Aguarde o `retryAfter` segundos
2. Implemente backoff exponencial
3. Considere usar caching local
4. Solicitar aumento de limite (entrando em contato)

### "Missing authorization header"

Certifique-se que:

- Header é `Authorization`, não `Auth`
- Formato é `Bearer <key>`, não `Basic` ou outro
- A chave está presente e válida

## 📚 Exemplos Práticos

### JavaScript/Node.js

```typescript
import fetch from "node-fetch";

class ThinkCoffeeClient {
  constructor(apiKey: string, baseUrl = "http://localhost:4000/graphql") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async query(query: string, variables?: any) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      throw new Error("Rate limited");
    }

    return response.json();
  }
}
```

### Python

```python
import requests

class ThinkCoffeeClient:
    def __init__(self, api_key: str, base_url: str = "http://localhost:4000/graphql"):
        self.api_key = api_key
        self.base_url = base_url

    def query(self, query: str, variables: dict = None):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = requests.post(
            self.base_url,
            json={"query": query, "variables": variables},
            headers=headers
        )

        if response.status_code == 429:
            raise Exception("Rate limited")

        return response.json()
```

---

**Status**: ✅ Implementado  
**Versão**: 0.2.0  
**Próximo**: Implementar caching distribuído com Redis
