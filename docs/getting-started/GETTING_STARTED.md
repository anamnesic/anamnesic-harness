# Getting Started with ThinkCoffee

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Git

### Setup Steps

1. **Clone and Install**

```bash
git clone https://github.com/yourusername/thinkcoffee.git
cd thinkcoffee
npm install
npm install -w backend -w frontend
```

2. **Start the Backend**

```bash
npm run dev:backend
```

The GraphQL server will start at `http://localhost:4000/graphql`

3. **Start the Frontend** (in another terminal)

```bash
npm run dev:frontend
```

The dashboard will be available at `http://localhost:3000`

4. **Access the App**

- Open browser to `http://localhost:3000`
- Create your first project
- Add context entries and decisions

## Development Workflow

### Backend Development

```bash
cd backend
npm install
npm run dev
```

Changes to TypeScript files will auto-reload with ts-node-dev.

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Vite provides HMR for instant updates.

### Testing GraphQL Queries

Visit `http://localhost:4000/graphql` to explore the GraphQL API with Apollo Sandbox.

## Project Architecture

### Backend (`/backend`)

- **GraphQL API** with Apollo Server
- **TypeORM** for database management
- **SQLite** for development (easily switchable to PostgreSQL)
- Entities: Project, ContextEntry, Decision

### Frontend (`/frontend`)

- **React 18** with TypeScript
- **Apollo Client** for GraphQL queries
- **Tailwind CSS** for styling
- Components for project management, context entry, and decision tracking

### Shared (`/shared`)

- TypeScript types and interfaces
- Shared utilities and constants

## Core Features

### Projects

Create isolated projects to organize AI tool contexts. Each project maintains:

- Context entries (architecture, requirements, dependencies, standards)
- Architectural decisions with rationale
- Team collaboration (Pro tier)

### Context Entries

Store key information about your project:

- **Categories**: Architecture, Requirements, Dependencies, Standards, General
- **Priority Levels**: Low (1) to Critical (4)
- **Real-time Access**: Available to all integrated AI tools

### Decisions

Document architectural decisions:

- Title and detailed rationale
- Link to alternatives considered
- Status tracking (active, deprecated, etc.)
- Timeline and audit trail

## API Examples

### Get All Projects

```graphql
query {
  projects {
    id
    name
    description
    status
    contextEntries {
      id
    }
    decisions {
      id
    }
  }
}
```

### Create Context Entry

```graphql
mutation {
  createContextEntry(
    projectId: "project-uuid"
    key: "Tech Stack"
    value: "Node.js + TypeScript + GraphQL"
    category: "architecture"
    priority: 3
  ) {
    id
    key
    value
  }
}
```

### Get Project Details

```graphql
query {
  project(id: "project-uuid") {
    id
    name
    contextEntries {
      id
      key
      value
      category
      priority
    }
    decisions {
      id
      title
      description
      status
    }
  }
}
```

## Database

### Development

SQLite database is auto-created as `database.sqlite` in the backend directory.

### Production

For production, update `backend/src/data-source.ts`:

```typescript
type: 'postgres',
host: process.env.DB_HOST,
port: parseInt(process.env.DB_PORT || '5432'),
database: process.env.DB_NAME,
username: process.env.DB_USER,
password: process.env.DB_PASSWORD,
```

## Environment Variables

Create `.env` in the root directory:

```
PORT=4000
NODE_ENV=development
DATABASE_URL=sqlite:database.sqlite
GRAPHQL_ENDPOINT=http://localhost:4000/graphql
```

## Troubleshooting

### Port Already in Use

```bash
# Change port in backend/.env or frontend vite.config.ts
PORT=4001 npm run dev:backend
```

### Database Issues

```bash
# Reset database (development only)
rm database.sqlite
npm run dev:backend
```

### GraphQL Connection Error

- Ensure backend is running on port 4000
- Check `frontend/src/index.tsx` for correct GraphQL URI
- Verify CORS is enabled in backend

## Next Steps

1. Create your first project
2. Add context entries for your current project
3. Document key architectural decisions
4. Integrate with your favorite AI tools
5. Share context with team members (Pro tier)

## Support

For issues and feature requests, visit the GitHub issues page or check the documentation at `/docs`.
