#!/usr/bin/env bash

# deployment.sh
# Script basico para deploy e atualizacao via docker-compose (V3 Safety Net)

set -e

echo "Starting Deployment Process (V3 Agent Safety Net)..."

export THINKCOFFEE_VERSION=$(git rev-parse HEAD | cut -c1-7)

# 1. Atualizar repoh
echo "1. Pulling latest code..."
git pull origin main

# 2. Build local images (se for custom registry, faca pull aqui)
echo "2. Building Docker images with version: $THINKCOFFEE_VERSION..."
docker build --build-arg THINKCOFFEE_VERSION=$THINKCOFFEE_VERSION -f Dockerfile -t thinkcoffee/mcp-server:latest .
docker build --build-arg THINKCOFFEE_VERSION=$THINKCOFFEE_VERSION -f Dockerfile.cli -t thinkcoffee/cli:latest .

# 3. Setup data directory structure
echo "3. Creating data structure for V3..."
mkdir -p /opt/thinkcoffee/data
mkdir -p /opt/thinkcoffee/data/snapshots
mkdir -p /opt/thinkcoffee/data/logs
chmod -R 777 /opt/thinkcoffee/data # ajustar p/ usuario especifico em prod

# 4. Stop environment
echo "4. Stopping old instance..."
docker compose down || true

# 5. Start environment
echo "5. Starting new instance..."
docker compose up -d

echo "✅ Deploy completed! Version: $THINKCOFFEE_VERSION"
