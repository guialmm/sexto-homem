#!/usr/bin/env bash
# Loads the local credentials and the three workflows into the running n8n,
# publishes them and restarts n8n so the schedule and webhooks go live.
#
#   docker compose up -d && scripts/importar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

n8n() { docker compose exec -T n8n n8n "$@" 2>&1 | grep -viE "license|migration lock|restart n8n|will not take effect" || true; }

echo "→ credenciais locais (Postgres e Mailpit do docker-compose)"
docker compose cp n8n/credenciais.local.json n8n:/tmp/credenciais.json >/dev/null
n8n import:credentials --input=/tmp/credenciais.json

echo "→ workflows"
npm run -s workflows
for w in alertas inscricao edicao; do
  n8n import:workflow --input="/workflows/$w.json"
done
for id in alertasSextoHo01 inscricaoSexto01 edicaoSextoHom01; do
  n8n publish:workflow --id="$id"
done

docker compose restart n8n >/dev/null
echo "✓ pronto: n8n em http://localhost:5678, e-mails em http://localhost:8026"
