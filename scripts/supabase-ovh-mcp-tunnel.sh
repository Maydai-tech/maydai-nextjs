#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${SUPABASE_OVH_SSH_HOST:-ubuntu@57.130.47.254}"
LOCAL_PORT="${SUPABASE_OVH_LOCAL_MCP_PORT:-8080}"
REMOTE_HOST="${SUPABASE_OVH_REMOTE_API_HOST:-127.0.0.1}"
REMOTE_PORT="${SUPABASE_OVH_REMOTE_API_PORT:-8000}"
CONTROL_PATH="${SUPABASE_OVH_MCP_CONTROL_PATH:-supabase/.temp/ovh-mcp-tunnel.sock}"

mkdir -p "$(dirname "$CONTROL_PATH")"

is_port_in_use() {
  lsof -nP -iTCP:"$LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1
}

case "${1:-status}" in
  start)
    if is_port_in_use; then
      echo "Port 127.0.0.1:${LOCAL_PORT} is already listening; leaving existing tunnel/process untouched."
      exit 0
    fi

    ssh -fN -M -S "$CONTROL_PATH" \
      -o ExitOnForwardFailure=yes \
      -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
      "$SSH_HOST"
    echo "Supabase OVH MCP tunnel listening on 127.0.0.1:${LOCAL_PORT}"
    ;;
  stop)
    ssh -S "$CONTROL_PATH" -O exit "$SSH_HOST"
    ;;
  status)
    if ssh -S "$CONTROL_PATH" -O check "$SSH_HOST" 2>/dev/null; then
      exit 0
    fi

    if is_port_in_use; then
      echo "Port 127.0.0.1:${LOCAL_PORT} is listening, but not through this script's control socket."
      exit 0
    fi

    echo "Supabase OVH MCP tunnel is not running."
    exit 1
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
