# GitHub Copilot Integration

This integration allows GitHub Copilot to access ThinkCoffee's context management system, providing it with project-specific information to improve code suggestions.

## How It Works

1. **Context Injection**: Copilot queries ThinkCoffee for relevant project context
2. **Real-time Updates**: Context is synchronized as the project evolves
3. **Decision Awareness**: Copilot understands architectural decisions
4. **Consistent Outputs**: Maintains coherence with other AI tools

## API Endpoints

### Get Project Context

```http
GET /graphql
Query: {
  contextEntries(projectId: "project-uuid", category: "architecture") {
    key
    value
    priority
  }
}
```

### Get Architectural Decisions

```http
GET /graphql
Query: {
  decisions(projectId: "project-uuid") {
    title
    description
    rationale
  }
}
```

## Example Usage

```typescript
// Copilot integration service
class ThinkCoffeeIntegration {
  async getProjectContext(projectId: string, categories?: string[]) {
    const query = `
      query GetContext($projectId: ID!, $categories: [String]) {
        contextEntries(projectId: $projectId, category: $categories) {
          key
          value
          priority
          category
        }
      }
    `;

    // Execute query and return formatted context
  }

  async getDecisions(projectId: string) {
    const query = `
      query GetDecisions($projectId: ID!) {
        decisions(projectId: $projectId) {
          title
          description
          rationale
        }
      }
    `;

    // Execute query and return decisions
  }
}
```

## Benefits

- **Better Code Suggestions**: Copilot understands project architecture
- **Reduced Context Switching**: Developers don't need to re-explain context
- **Consistent Patterns**: Maintains coding standards across the project
- **Decision Preservation**: Architectural choices are respected

## Setup

1. Install ThinkCoffee Copilot extension
2. Configure project ID in extension settings
3. Copilot automatically queries ThinkCoffee for context
4. Context is injected into Copilot's prompt engineering

## Security

- OAuth 2.0 authentication
- Project-level access controls
- Encrypted context storage
- Audit logging for all access
