#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

OUT_DIR="/var/www/monitoring"
OUT_FILE="${OUT_DIR}/disk.json"
TMP_FILE="${OUT_FILE}.tmp"

# Récupère les bytes et le % d'usage de la partition /
# Colonnes df: Filesystem 1B-blocks Used Available Use% Mounted on
read -r total used avail usep < <(df -B1 / | awk 'NR==2 {gsub(/%/,"",$5); print $2, $3, $4, $5}')

# Conversion en Go (gigaoctets = 10^9) avec 1 décimale
total_go="$(awk -v v="$total" 'BEGIN { printf "%.1f", v/1000000000 }')"
used_go="$(awk -v v="$used"  'BEGIN { printf "%.1f", v/1000000000 }')"
free_go="$(awk -v v="$avail" 'BEGIN { printf "%.1f", v/1000000000 }')"

# Pourcentage d'utilisation en nombre (0-100)
use_percent="$(awk -v v="$usep" 'BEGIN { printf "%d", v }')"

# ISO 8601 (UTC) ex: 2026-03-26T10:42:03Z
updated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

umask 022
mkdir -p "$OUT_DIR"

# Écriture atomique: écrit dans TMP puis mv
cat > "$TMP_FILE" <<EOF
{
  "total": $total_go,
  "used": $used_go,
  "free": $free_go,
  "usePercent": "${use_percent}%",
  "updatedAt": "$updated_at"
}
EOF

mv -f "$TMP_FILE" "$OUT_FILE"
