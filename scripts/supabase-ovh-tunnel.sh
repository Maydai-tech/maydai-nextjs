#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SUPABASE_OVH_SSH_HOST:-ubuntu@57.130.47.254}"
LOCAL_PORT="${SUPABASE_OVH_LOCAL_DB_PORT:-15432}"
REMOTE_HOST="${SUPABASE_OVH_REMOTE_DB_HOST:-127.0.0.1}"
REMOTE_PORT="${SUPABASE_OVH_REMOTE_DB_PORT:-5432}"
CONTROL_PATH="${SUPABASE_OVH_CONTROL_PATH:-supabase/.temp/ovh-tunnel.sock}"

mkdir -p "$(dirname "$CONTROL_PATH")"

case "${1:-status}" in
  start)
    ssh -fN -M -S "$CONTROL_PATH" \
      -o ExitOnForwardFailure=yes \
      -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
      "$SSH_HOST"
    echo "Supabase OVH DB tunnel listening on 127.0.0.1:${LOCAL_PORT}"
    ;;
  stop)
    ssh -S "$CONTROL_PATH" -O exit "$SSH_HOST"
    ;;
  status)
    ssh -S "$CONTROL_PATH" -O check "$SSH_HOST"
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
