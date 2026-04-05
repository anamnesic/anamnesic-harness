# Architecture & Integration Guide

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Developer IDEs                    │
│         (VS Code, JetBrains, Cursor, etc.)         │
└────────────┬────────────────────────────────┬──────┘
             │                                │
      ┌──────▼─────┐                  ┌──────▼─────┐
      │ GitHub     │                  │   Claude   │
      │ Copilot    │                  │   API      │
      └──────┬─────┘                  └──────┬─────┘
             │                                │
             └────────────┬──────────────────┘
                          │
                    ┌─────▼──────────┐
                    │  ThinkCoffee   │
                    │   API Layer    │
                    │  (GraphQL)     │
                    └─────┬──────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    ┌───▼────┐    ┌──────▼────┐    ┌──────▼────┐
    │Project │    │ Context   │    │ Decision  │
    │Manager │    │ Storage   │    │ Records   │
    └────────┘    └───────────┘    └───────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    ┌─────▼──────────┐
                    │  SQLite/       │
                    │  PostgreSQL    │
                    │  Database      │
                    └────────────────┘
```

## AI Tool Integration Pattern

Each AI tool integration follows this pattern:

### 1. Context Query

```typescript
async getProjectContext(projectId: string): Promise<Context> {
  const query = `
    query {
      contextEntries(projectId: "${projectId}") {
        key
        value
        category
        priority
      }
    }
  `;
  return await graphqlClient.query(query);
}
```

### 2. Context Injection

The retrieved context is injected into the AI tool's prompt:

```
System Prompt:
You are an AI coding assistant for the project: [Project Name]

PROJECT CONTEXT:
${contextEntries.map(e => `- ${e.key}: ${e.value}`).join('\n')}

ARCHITECTURAL DECISIONS:
${decisions.map(d => `- ${d.title}: ${d.description}`).join('\n')}

[Original system prompt continues...]
```

### 3. Sync on Update

When the developer makes changes in ThinkCoffee, they're pushed to the AI tool:

```typescript
webSocket.on("context-updated", (event) => {
  refreshContext(event.projectId);
  notifyAITool("Context updated");
});
```

## Creating a New AI Tool Integration

### Step 1: Define Integration Type

```typescript
// integrations/types.ts
interface AIToolIntegration {
  name: string;
  authenticate(): Promise<void>;
  getContext(projectId: string): Promise<Context>;
  updateContext(projectId: string, context: Context): Promise<void>;
  isConnected(): boolean;
}
```

### Step 2: Implement Integration

```typescript
// integrations/claude-ai.ts
export class ClaudeIntegration implements AIToolIntegration {
  name = "Claude AI";

  async authenticate() {
    // Handle API key setup
  }

  async getContext(projectId: string) {
    const response = await graphqlClient.query({
      query: GET_PROJECT_CONTEXT,
      variables: { projectId },
    });
    return response.data.contextEntries;
  }

  async updateContext(projectId: string, context: Context) {
    // Push updated context to Claude
  }

  isConnected(): boolean {
    return !!this.apiKey;
  }
}
```

### Step 3: Register Integration

```typescript
// backend/src/integrations/index.ts
export const integrations = {
  copilot: new GitHubCopilotIntegration(),
  claude: new ClaudeIntegration(),
  cursor: new CursorIntegration(),
};
```

### Step 4: Create Integration Panel (Frontend)

```typescript
// frontend/src/components/IntegrationPanel.tsx
export function IntegrationPanel({ projectId }) {
  return (
    <div className="integrations-panel">
      <h3>Connected Tools</h3>
      <IntegrationCard name="GitHub Copilot" status="connected" />
      <IntegrationCard name="Claude" status="disconnected" />
      <button>Add Integration</button>
    </div>
  );
}
```

## Real-time Synchronization

### WebSocket Connection

```typescript
// backend/src/websocket.ts
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("subscribe", (projectId) => {
    ws.subscribe(`project:${projectId}`);
  });
});

// Broadcast context updates
AppDataSource.eventEmitter.on("context-updated", (event) => {
  wss.publish(`project:${event.projectId}`, {
    type: "CONTEXT_UPDATED",
    data: event,
  });
});
```

### Client-side Listener

```typescript
// frontend/src/hooks/useContextSync.ts
export function useContextSync(projectId: string) {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "SUBSCRIBE", projectId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "CONTEXT_UPDATED") {
        refetchProjectContext();
      }
    };

    return () => ws.close();
  }, [projectId]);
}
```

## Authentication & Security

### API Key Management

```typescript
// backend/src/auth/apiKeys.ts
export class APIKeyManager {
  generateApiKey(projectId: string): string {
    const key = crypto.randomBytes(32).toString("hex");
    // Store hashed key in database
    return key;
  }

  validateApiKey(key: string): boolean {
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    // Check against stored keys
  }
}
```

### Rate Limiting

```typescript
// backend/src/middleware/rateLimiter.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip,
});
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:backend

EXPOSE 4000

CMD ["npm", "run", "start"]
```

### Docker Compose

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/thinkcoffee
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: thinkcoffee
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
```

## Performance Optimization

### GraphQL Query Optimization

```typescript
// Use DataLoader to batch requests
const contextLoader = new DataLoader(async (projectIds) => {
  return await contextRepository.find({
    where: { project: { id: In(projectIds) } },
  });
});
```

### Caching Strategy

```typescript
// Redis caching for frequently accessed context
redis.get(`context:${projectId}`, async () => {
  return await getProjectContext(projectId);
});
```

## Monitoring & Analytics

Track:

- API response times
- Context query patterns
- AI tool integration performance
- User engagement metrics

```typescript
// backend/src/middleware/analytics.ts
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    analytics.track({
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
    });
  });

  next();
});
```
