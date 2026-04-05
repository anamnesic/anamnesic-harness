# ==============================================================================
# ThinkCoffee MCP Server - Multi-stage Dockerfile (V4 - Agent Safety Net)
# ==============================================================================
# Build: docker build -t thinkcoffee/mcp-server:latest .
# Run:   docker run -v thinkcoffee_data:/data thinkcoffee/mcp-server:latest
#
# V4 changes:
#   - Health check via HTTP endpoint (/health)
#   - Explicit NODE_OPTIONS for memory limits
#   - SIGTERM/SIGINT graceful shutdown support
#   - Tighter file permissions on /data subdirs
# ==============================================================================

# --- Stage 1: Build -----------------------------------------------------------
FROM node:20-alpine AS builder

ARG THINKCOFFEE_VERSION=dev

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

# Write version file
RUN echo "{\"version\":\"${THINKCOFFEE_VERSION}\",\"buildDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    > /app/packages/mcp-server/dist/version.json

# --- Stage 2: Production ------------------------------------------------------
FROM node:20-alpine AS production

# Security + traceability labels
LABEL org.opencontainers.image.title="ThinkCoffee MCP Server"
LABEL org.opencontainers.image.description="AI Context Management Platform - MCP Server (V4 Agent Safety Net)"
LABEL org.opencontainers.image.source="https://github.com/thinkcoffee/thinkcoffee"
LABEL org.opencontainers.image.vendor="ThinkCoffee Team"
LABEL org.opencontainers.image.version="${THINKCOFFEE_VERSION}"

# Install curl for HTTP health checks
RUN apk add --no-cache curl tini

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

# Data directory structure:
#   /data/data.sqlite        - SQLite database
#   /data/snapshots/          - File snapshots for rollback (V3)
#   /data/logs/               - Action logs JSONL (V3)
RUN mkdir -p /data /data/snapshots /data/logs && \
    chown -R thinkcoffee:thinkcoffee /data /app && \
    chmod 750 /data /data/snapshots /data/logs

USER thinkcoffee

# ---- Environment defaults ----
ENV NODE_ENV=production \
    THINKCOFFEE_DB_PATH=/data/data.sqlite \
    THINKCOFFEE_DATA_DIR=/data \
    THINKCOFFEE_SNAPSHOT_DIR=/data/snapshots \
    THINKCOFFEE_LOG_DIR=/data/logs \
    MCP_PORT=3000 \
    LOG_LEVEL=info \
    # V3/V4 Safety Net defaults \
    THINKCOFFEE_SNAPSHOT_RETENTION_DAYS=7 \
    THINKCOFFEE_SNAPSHOT_MAX_SIZE_MB=50 \
    THINKCOFFEE_DRY_RUN_DEFAULT=false \
    THINKCOFFEE_DIFF_PREVIEW_MODE=existing-only \
    THINKCOFFEE_COMMAND_CONFIRMATION=destructive-only \
    # Node memory limit (256MB default -- adjust per host) \
    NODE_OPTIONS="--max-old-space-size=256"

EXPOSE 3000

VOLUME ["/data"]

# Health check via HTTP (fallback to filesystem check)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:3000/health > /dev/null 2>&1 || \
      node -e " \
        const fs = require('fs'); \
        try { \
          fs.accessSync('/data', fs.constants.W_OK); \
          fs.accessSync('/data/snapshots', fs.constants.W_OK); \
          fs.accessSync('/data/logs', fs.constants.W_OK); \
          process.exit(0); \
        } catch(e) { process.exit(1); } \
      "

# Use tini for proper signal handling (graceful shutdown)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/mcp-server/dist/index.js"]
