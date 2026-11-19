#!/usr/bin/env bash
# Base Supabase preprod séparée de la prod (MAY-30). Voir docs/preprod-database.md.
#
#   ./preprod-db.sh init      génère .env (secrets propres à la preprod) s'il n'existe pas
#   ./preprod-db.sh refresh   copie la prod (lecture seule) puis anonymise, dans la base preprod
#
# À lancer sur le serveur depuis /opt/supabase-preprod.
set -euo pipefail
cd "$(dirname "$0")"

SOURCE=${SOURCE_CONTAINER:-supabase-db}   # base prod : uniquement lue (pg_dump)
TARGET=${TARGET_CONTAINER:-preprod-db}    # base preprod : effacée puis remplie
SCHEMAS=(-n public -n auth -n storage -n supabase_migrations -e vector)
SERVICES=(auth rest storage preprod-kong)        # coupés pendant le rafraîchissement

die() { echo "ERREUR : $*" >&2; exit 1; }
psql_in() { local c=$1; shift; docker exec -i "$c" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -X -q "$@"; }

init() {
  [ -e .env ] && die ".env existe déjà, rien n'est écrasé"
  python3 - <<'PY'
import base64, hashlib, hmac, json, secrets, time

def b64(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
def jwt(role, secret):
    now = int(time.time())
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64(json.dumps({"role": role, "iss": "supabase", "iat": now, "exp": now + 10 * 365 * 86400}).encode())
    sig = b64(hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"

jwt_secret = secrets.token_hex(32)
values = {
    "POSTGRES_PASSWORD": secrets.token_hex(24),
    "JWT_SECRET": jwt_secret,
    "ANON_KEY": jwt("anon", jwt_secret),
    "SERVICE_ROLE_KEY": jwt("service_role", jwt_secret),
    "API_EXTERNAL_URL": "https://api-preprod.maydai.io",
    "SITE_URL": "https://preprod.maydai.io",
    "GOTRUE_URI_ALLOW_LIST": "http://localhost:3000,https://preprod.maydai.io,https://preprod.maydai.io/**,https://maydai-*.vercel.app/**",
    "PREPROD_KEEP_EMAILS": r"@maydai\.io$",
    "PREPROD_TEST_PASSWORD": secrets.token_urlsafe(18),
}
with open(".env", "w") as f:
    f.write("# Secrets de la base preprod (MAY-30) : propres à la preprod, jamais ceux de la prod.\n")
    for k, v in values.items():
        f.write(f"{k}='{v}'\n")
PY
  chmod 600 .env
  echo ".env créé. Clés à reporter dans Vercel : ANON_KEY, SERVICE_ROLE_KEY (voir la doc)."
}

refresh() {
  if [ -f .env ]; then set -a; . ./.env; set +a; fi
  local keep=${PREPROD_KEEP_EMAILS:?PREPROD_KEEP_EMAILS manquant}
  local pw=${PREPROD_TEST_PASSWORD:-}

  # Garde-fous : jamais d'écriture ailleurs que dans la base marquée preprod.
  [ "$SOURCE" != "$TARGET" ] || die "source et cible identiques"
  [ "$(psql_in "$TARGET" -Atc 'show cluster_name')" = "maydai-preprod" ] || die "$TARGET n'est pas la base preprod"
  [ "$(psql_in "$SOURCE" -Atc 'show cluster_name')" != "maydai-preprod" ] || die "$SOURCE est une base preprod"

  # Mots de passe des rôles techniques alignés sur celui de la preprod (une base neuve ne le fait pas).
  docker exec -i "$TARGET" sh -c 'psql -U supabase_admin -d postgres -X -q -v ON_ERROR_STOP=1 -v p="$POSTGRES_PASSWORD"' <<'SQL'
alter role authenticator password :'p';
alter role supabase_auth_admin password :'p';
alter role supabase_storage_admin password :'p';
SQL

  local dump
  dump=$(mktemp)
  trap "rm -f '$dump'" EXIT

  echo "1/4 Copie de la prod (lecture seule)…"
  docker exec "$SOURCE" pg_dump -U supabase_admin -d postgres -Fc "${SCHEMAS[@]}" > "$dump"

  if [ -z "${SKIP_COMPOSE:-}" ]; then
    echo "2/4 Coupure de l'API preprod…"
    docker compose stop "${SERVICES[@]}"
  fi

  local wipe='drop schema if exists public, auth, storage, supabase_migrations cascade'
  echo "3/4 Remplacement des données preprod…"
  psql_in "$TARGET" -c "$wipe"
  # Droits de rôles présents en prod mais pas sur une base neuve (rôles hors dump) : requis par le stockage.
  psql_in "$TARGET" -c 'grant anon, authenticated, service_role to supabase_storage_admin'
  echo "4/4 Anonymisation…"
  # Si la restauration ou l'anonymisation échoue, la copie brute est effacée : jamais de données
  # prod non anonymisées en preprod. L'API preprod reste alors coupée.
  if ! { docker exec -i "$TARGET" pg_restore -U supabase_admin -d postgres --exit-on-error < "$dump" &&
         psql_in "$TARGET" -1 -v keep_emails="$keep" -v test_password="$pw" < anonymize.sql; }; then
    psql_in "$TARGET" -c "$wipe"
    die "échec : copie effacée, API preprod laissée coupée"
  fi
  psql_in "$TARGET" -c 'vacuum analyze'

  if [ -z "${SKIP_COMPOSE:-}" ]; then
    docker compose start "${SERVICES[@]}"
  fi
  echo "Preprod rafraîchie."
}

case "${1:-}" in
  init) init ;;
  refresh) refresh ;;
  *) echo "Usage : $0 {init|refresh}" >&2; exit 2 ;;
esac
