#!/bin/bash
# ThinkCoffee - Script de Deployment (Legacy)
set -e

echo "[ThinkCoffee] Deployment legacy..."

docker compose up -d --build mcp-server
