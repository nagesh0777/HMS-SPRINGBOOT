#!/usr/bin/env bash
# Deploy Trikaar HMS to Production on VPS (/opt/hms-springboot).
# Safe to run directly on the VPS or triggered from Jenkins/CI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "🚀 [$(date '+%Y-%m-%d %H:%M:%S')] Starting Trikaar HMS deployment..."

# Pull latest changes if git repository is initialized
if [ -d ".git" ]; then
  echo "📥 Pulling latest main branch..."
  git fetch origin main || true
  git checkout main || true
  git reset --hard origin/main || true
fi

echo "🐳 Building and starting Docker containers..."
docker compose up -d --build --remove-orphans

echo "⏳ Waiting for services to initialize..."
sleep 10

echo "🏥 Checking container health..."
docker compose ps

# Prune unused dangling images to prevent disk exhaustion
docker image prune -f >/dev/null 2>&1 || true

echo "✅ [$(date '+%Y-%m-%d %H:%M:%S')] Deployment completed successfully! Live at https://hms.trikaar.tech"
