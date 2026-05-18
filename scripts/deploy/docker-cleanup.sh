#!/usr/bin/env bash
# Wrapper de purge Docker hebdomadaire pour MaydAI prod (57.130.47.254).
# Lance docker system prune + docker builder prune, parse l'espace récupéré,
# et append une entrée dans /var/www/monitoring/docker-purges.json (max 30 entrées).
#
# Déployé en /usr/local/bin/docker-cleanup.sh (chmod 755, owner root).
# Cron: `0 3 * * 0 /usr/local/bin/docker-cleanup.sh` (crontab -e en root).

set -uo pipefail

OUT_FILE="/var/www/monitoring/docker-purges.json"
TMP_FILE="${OUT_FILE}.tmp"
MAX_ENTRIES=30

mkdir -p "$(dirname "$OUT_FILE")"

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
df_free_bytes() { df -B1 / | awk 'NR==2 {print $4}'; }

# Parse "Total reclaimed space: X.XGB" depuis l'output et retourne les bytes.
# Gère B / KB / MB / GB / TB et la valeur littérale "0B".
parse_reclaimed() {
  awk '
    /Total reclaimed space:/ {
      raw = $NF
      n = raw
      sub(/[KMGT]?B$/, "", n)
      unit = substr(raw, length(n)+1)
      factor = 1
      if (unit == "KB") factor = 1000
      else if (unit == "MB") factor = 1000000
      else if (unit == "GB") factor = 1000000000
      else if (unit == "TB") factor = 1000000000000
      printf "%d", n * factor
      found=1
      exit
    }
    END { if (!found) print "0" }
  ' "$1"
}

ran_at="$(now_iso)"
free_before="$(df_free_bytes)"

system_log="$(mktemp)"
builder_log="$(mktemp)"
trap 'rm -f "$system_log" "$builder_log" "$TMP_FILE"' EXIT

system_exit=0
builder_exit=0
error_message=""

if ! docker system prune -f --filter "until=168h" > "$system_log" 2>&1; then
  system_exit=$?
  error_message+="docker system prune exit=$system_exit. "
fi

if ! docker builder prune -f --filter "until=168h" > "$builder_log" 2>&1; then
  builder_exit=$?
  error_message+="docker builder prune exit=$builder_exit. "
fi

system_bytes="$(parse_reclaimed "$system_log")"
builder_bytes="$(parse_reclaimed "$builder_log")"
total_bytes=$((system_bytes + builder_bytes))

free_after="$(df_free_bytes)"
exit_code=0
if [[ $system_exit -ne 0 || $builder_exit -ne 0 ]]; then
  exit_code=1
fi

if [[ -z "$error_message" ]]; then
  error_message_json="null"
else
  # Replace control chars (newline/tab/CR) with single space to keep JSON valid.
  error_message="${error_message//$'\n'/ }"
  error_message="${error_message//$'\t'/ }"
  error_message="${error_message//$'\r'/ }"
  # Échappe les guillemets et les backslashes pour produire un JSON valide.
  escaped="${error_message//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  error_message_json="\"${escaped%% }\""
fi

new_entry="$(cat <<EOF
{
  "ranAt": "$ran_at",
  "systemPruneReclaimedBytes": $system_bytes,
  "builderPruneReclaimedBytes": $builder_bytes,
  "totalReclaimedBytes": $total_bytes,
  "diskFreeBeforeBytes": $free_before,
  "diskFreeAfterBytes": $free_after,
  "exitCode": $exit_code,
  "errorMessage": $error_message_json
}
EOF
)"

# Charge l'array existant (ou []), append, tronque à MAX_ENTRIES (les plus récentes).
existing="[]"
if [[ -s "$OUT_FILE" ]]; then
  if jq empty "$OUT_FILE" >/dev/null 2>&1; then
    existing="$(cat "$OUT_FILE")"
  else
    # JSON corrompu — on repart d'un tableau vide.
    logger -t docker-cleanup "JSON corrompu dans $OUT_FILE, reset à []"
  fi
fi

# Ajoute l'entrée puis ne garde que les MAX_ENTRIES plus récentes (par ranAt desc).
if ! echo "$existing" \
     | jq --argjson entry "$new_entry" --argjson max "$MAX_ENTRIES" \
          '. + [$entry] | sort_by(.ranAt) | reverse | .[:$max] | reverse' \
     > "$TMP_FILE"; then
  logger -t docker-cleanup "jq pipeline failed — OUT_FILE inchangé"
  exit 1
fi

mv -f "$TMP_FILE" "$OUT_FILE"
chmod 644 "$OUT_FILE"

logger -t docker-cleanup "purge done: system=${system_bytes}B builder=${builder_bytes}B total=${total_bytes}B exit=${exit_code}"
exit 0
