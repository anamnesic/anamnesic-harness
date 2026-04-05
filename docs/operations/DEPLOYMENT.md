# Docker & Production Deployment

## Docker Setup

### Backend Dockerfile

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/tsconfig.json .
COPY backend/.env .env

RUN npm install -g ts-node typescript

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["ts-node", "src/index.ts"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Docker Compose (Development)

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      DATABASE_URL: sqlite:database.sqlite
      CORS_ORIGIN: http://localhost:3000
    volumes:
      - ./backend/src:/app/src
      - backend-data:/app/data
    command: npm run dev

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      VITE_GRAPHQL_URL: http://localhost:4000/graphql
    volumes:
      - ./frontend/src:/app/src
    command: npm run dev

volumes:
  backend-data:
```

### Docker Compose (Production)

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      CORS_ORIGIN: ${FRONTEND_URL}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      VITE_GRAPHQL_URL: ${BACKEND_URL}/graphql
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres-data:
```

## Production Environment Variables

Create `.env.production`:

```
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@db:5432/thinkcoffee_prod
DB_HOST=db
DB_PORT=5432
DB_NAME=thinkcoffee_prod
DB_USER=thinkcoffee_user
DB_PASSWORD=secure_password_here

# CORS
CORS_ORIGIN=https://yourdomain.com

# Security
JWT_SECRET=your_jwt_secret_here
API_KEY_SECRET=your_api_key_secret_here

# External Services
SENTRY_DSN=https://key@sentry.io/project_id

# Monitoring
LOG_LEVEL=info
```

## Kubernetes Deployment

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thinkcoffee-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: thinkcoffee-backend
  template:
    metadata:
      labels:
        app: thinkcoffee-backend
    spec:
      containers:
        - name: backend
          image: thinkcoffee/backend:latest
          ports:
            - containerPort: 4000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: thinkcoffee-secrets
                  key: database-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: thinkcoffee-backend
spec:
  selector:
    app: thinkcoffee-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: thinkcoffee-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.thinkcoffee.io
      secretName: thinkcoffee-tls
  rules:
    - host: api.thinkcoffee.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: thinkcoffee-backend
                port:
                  number: 80
```

## Database Migrations

### Setup TypeORM CLI

```json
{
  "scripts": {
    "typeorm": "typeorm",
    "migration:generate": "typeorm migration:generate",
    "migration:run": "typeorm migration:run",
    "migration:revert": "typeorm migration:revert"
  }
}
```

### Running Migrations

```bash
# Automatically generate migration from schema changes
npm run migration:generate -- src/migrations/AddNewTable

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Backup & Recovery

### PostgreSQL Backup Script

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/thinkcoffee"
mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Restore from Backup

```bash
gunzip < backup_20240101_120000.sql.gz | psql -U $DB_USER $DB_NAME
```

## Monitoring & Logging

### Sentry Integration (Error Tracking)

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Logging with Winston

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});
```

## CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: |
          docker build -f backend/Dockerfile -t thinkcoffee/backend:latest ./backend
          docker build -f frontend/Dockerfile -t thinkcoffee/frontend:latest ./frontend

      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push thinkcoffee/backend:latest
          docker push thinkcoffee/frontend:latest

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/thinkcoffee-backend backend=thinkcoffee/backend:latest
          kubectl rollout status deployment/thinkcoffee-backend
```

## Performance Tuning

### Database Optimization

```sql
-- Create indexes for frequently queried fields
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_context_category ON context_entry(category);
CREATE INDEX idx_decision_status ON decision(status);

-- Partition large tables by date
CREATE TABLE context_entry_2024 PARTITION OF context_entry
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Nginx Configuration

```nginx
upstream backend {
    least_conn;
    server backend:4000 weight=3;
}

server {
    listen 80;
    server_name api.thinkcoffee.io;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json;

    # Caching
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;

    location / {
        proxy_pass http://backend;
        proxy_cache api_cache;
        proxy_cache_valid 200 1h;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
