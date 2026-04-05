# ==============================================================================
# ThinkCoffee MCP Server - Multi-stage Dockerfile
# ==============================================================================
# Build: docker build -t thinkcoffee/mcp-server:latest .
# Run:   docker run -v thinkcoffee_data:/data thinkcoffee/mcp-server:latest
# ==============================================================================

# --- Stage 1: Build -----------------------------------------------------------
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy workspace manifests first (layer cache optimization)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/cli/package.json ./packages/cli/

# Install all deps (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/src ./packages/core/src
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/mcp-server/src ./packages/mcp-server/src
COPY packages/mcp-server/tsconfig.json ./packages/mcp-server/
COPY packages/cli/src ./packages/cli/src
COPY packages/cli/tsconfig.json ./packages/cli/

# Build core first, then dependents (respecting workspace dependencies)
RUN pnpm build:core && \
    pnpm build:mcp && \
    pnpm build:cli

# --- Stage 2: Production ------------------------------------------------------
FROM node:20-alpine AS production

# Security: add labels
LABEL org.opencontainers.image.title="ThinkCoffee MCP Server"
LABEL org.opencontainers.image.description="AI Context Management Platform - MCP Server"
LABEL org.opencontainers.image.source="https://github.com/thinkcoffee/thinkcoffee"
LABEL org.opencontainers.image.vendor="ThinkCoffee Team"

RUN corepack enable && corepack prepare pnpm@9 --activate

# Security: non-root user
RUN addgroup -S thinkcoffee && adduser -S thinkcoffee -G thinkcoffee

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# Copy built artifacts from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist

# Data directory - persisted via volume mount
RUN mkdir -p /data && chown -R thinkcoffee:thinkcoffee /data /app

USER thinkcoffee

# Environment defaults
ENV NODE_ENV=production
ENV THINKCOFFEE_DB_PATH=/data/data.sqlite
ENV THINKCOFFEE_DATA_DIR=/data
ENV MCP_PORT=3000
ENV LOG_LEVEL=info

EXPOSE 3000

VOLUME ["/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('fs').accessSync('/data', require('fs').constants.W_OK)" || exit 1

CMD ["node", "packages/mcp-server/dist/index.js"]
