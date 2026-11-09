#!/usr/bin/env bash
# Loads the local credentials and the daily edition into the running n8n,
# publishes it and restarts n8n so the 8 a.m. schedule goes live.
#
#   docker compose up -d && scripts/importar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

n8n() { docker compose exec -T n8n n8n "$@" 2>&1 | grep -viE "license|migration lock|restart n8n|will not take effect" || true; }

echo "→ credenciais locais (Postgres e Mailpit do docker-compose)"
docker compose cp n8n/credenciais.local.json n8n:/tmp/credenciais.json >/dev/null
n8n import:credentials --input=/tmp/credenciais.json

echo "→ workflow da edição"
npm run -s workflows
n8n import:workflow --input=/workflows/edicao.json
n8n publish:workflow --id=edicaoSextoHom01

docker compose restart n8n >/dev/null
echo "✓ pronto: n8n em http://localhost:5678, e-mails em http://localhost:8026"
