#!/usr/bin/env bash
# Ferme l’accès anonyme à /monitoring/*.json sur l’hôte OVH.
#
# Prérequis : SUPABASE_OVH_SSH_HOST (ex. ubuntu@x.x.x.x) — jamais d’IP dans le repo.
# Usage : SUPABASE_OVH_SSH_HOST=ubuntu@… ./scripts/deploy/protect-ovh-monitoring.sh
#
# Sur l’hôte :
# - Caddy : ne plus reverse_proxy /monitoring sur l’IP publique (404 uniquement)
# - nginx :8080 : allow 127.0.0.1 / ::1 ; deny all  (voir nginx-e2e-reports.conf)

set -euo pipefail

if [[ -z "${SUPABASE_OVH_SSH_HOST:-}" ]]; then
  echo "SUPABASE_OVH_SSH_HOST is required (example: ubuntu@your.host)" >&2
  exit 2
fi

echo "==> Inspect ${SUPABASE_OVH_SSH_HOST}"
ssh "$SUPABASE_OVH_SSH_HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
echo "--- nginx /monitoring ---"
grep -n -A8 "location /monitoring" /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* 2>/dev/null || true
echo "--- Caddy monitoring / public IP ---"
grep -n -E "monitoring|reverse_proxy" /opt/supabase/Caddyfile || true
echo "--- local vs bind ---"
ss -lnt | grep -E ':80|:8080|:443' || true
REMOTE

echo
echo "Vérifs attendues :"
echo "  curl -sI http://127.0.0.1:8080/monitoring/disk.json     # 200 depuis l’hôte"
echo "  curl -sI http://\$HOST/monitoring/disk.json              # 404 depuis Internet"
echo "  curl -sI http://\$HOST:8080/monitoring/disk.json         # 403 depuis Internet"
echo
echo "API admin Vercel : HTTPS + basic auth (caddy-monitoring-basicauth.caddy)"
echo "et MONITORING_PROD_* + MONITORING_HTTP_USER / MONITORING_HTTP_PASSWORD."
