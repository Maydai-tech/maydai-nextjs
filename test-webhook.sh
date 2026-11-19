#!/usr/bin/env bash
# Simulation temporaire d’un webhook Hermes → /api/webhooks/kb-update
# Usage : bash test-webhook.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Charge INTERNAL_API_KEY (et le reste) depuis .env.local si présent
if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(INTERNAL_API_KEY)=' .env.local | sed 's/\r$//')
  set +a
fi

API_KEY="${INTERNAL_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "Erreur : INTERNAL_API_KEY manquant. Définis-le dans .env.local ou exporte-le." >&2
  exit 1
fi

# Retire d’éventuels guillemets autour de la valeur
API_KEY="${API_KEY%\"}"
API_KEY="${API_KEY#\"}"
API_KEY="${API_KEY%\'}"
API_KEY="${API_KEY#\'}"

URL="${WEBHOOK_URL:-http://localhost:3000/api/webhooks/kb-update}"

echo "→ POST $URL"
echo "→ file_name=comparia_ranking_2026-07-28.csv"
echo

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${API_KEY}" \
  -d '{
    "event": "kb_file_updated",
    "source": "hermes",
    "folder_name": "Bench_LLM",
    "subfolder_name": "comparia",
    "file_name": "comparia_ranking_2026-07-28.csv"
  }' \
  -w "\n\nHTTP %{http_code}\n"

echo
echo "Succès attendu : {\"success\":true,\"models_updated\":N}"
