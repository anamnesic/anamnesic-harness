#!/bin/bash
# ThinkCoffee - Script de Deploy
set -e

echo "[ThinkCoffee] Iniciando deploy..."

docker compose pull mcp-server || true
docker compose build mcp-server
docker compose up -d mcp-server

echo "[ThinkCoffee] Deploy finalizado."
