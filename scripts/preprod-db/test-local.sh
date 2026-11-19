#!/usr/bin/env bash
# Teste "preprod-db.sh refresh" sur deux bases jetables locales (Docker), sans toucher au serveur :
# une fausse prod (structure réelle de la prod + données fictives) copiée vers une fausse preprod,
# puis vérifie l'anonymisation, les garde-fous, la connexion GoTrue et la capture des emails.
#
# Usage : scripts/preprod-db/test-local.sh <structure-prod.sql>
#   structure-prod.sql : pg_dump --schema-only de la prod (voir docs/preprod-database.md).
set -euo pipefail
SCHEMA=$(realpath "${1:?Usage : $0 <structure-prod.sql>}")
cd "$(dirname "$0")"

IMG=supabase/postgres:15.8.1.085
NET=pp-test SRC=pp-test-src DST=pp-test-dst AUTH=pp-test-auth MAIL=pp-test-mail
JWT=test-jwt-secret-with-at-least-32-characters
TEST_PW=recette-pw-123

cleanup() { docker rm -f $SRC $DST $AUTH $MAIL >/dev/null 2>&1 || true; docker network rm $NET >/dev/null 2>&1 || true; }
[ -n "${KEEP:-}" ] || trap cleanup EXIT  # KEEP=1 : garder les conteneurs pour diagnostiquer
cleanup
fail() { echo "ÉCHEC : $*" >&2; exit 1; }
ok() { echo "OK : $*"; }
psql_in() { local c=$1; shift; docker exec -i "$c" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -X -q "$@"; }

docker network create $NET >/dev/null
start_db() {
  local name=$1; shift
  docker run -d --name "$name" --network $NET -e POSTGRES_PASSWORD=test -e PGPASSWORD=test -e JWT_SECRET=$JWT \
    $IMG postgres -c config_file=/etc/postgresql/postgresql.conf "$@" >/dev/null
}
wait_db() {
  until docker logs "$1" 2>&1 | grep -q 'init process complete'; do sleep 1; done
  until docker exec "$1" pg_isready -U postgres -h localhost -q; do sleep 1; done
}
start_db $SRC
start_db $DST -c cluster_name=maydai-preprod
wait_db $SRC
wait_db $DST

echo "Fausse prod : structure réelle + données fictives"
psql_in $SRC -c 'drop schema if exists public, auth, storage, supabase_migrations cascade'
psql_in $SRC < "$SCHEMA" >/dev/null
# Historique des migrations GoTrue, déjà appliquées en prod (sinon GoTrue les rejoue au démarrage).
docker run --rm --entrypoint ls supabase/gotrue:v2.164.0 /usr/local/etc/auth/migrations | grep -oE '^[0-9]+' |
  sed "s/.*/insert into auth.schema_migrations values ('&') on conflict do nothing;/" | psql_in $SRC
psql_in $SRC <<'SQL'
set session_replication_role = replica;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change) values
 ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
  'alice@maydai.io', extensions.crypt('alice-pw-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"email":"alice@maydai.io","first_name":"Alice"}', now(), now(), '', '', '', ''),
 ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
  'bob.martin@client-secret.fr', extensions.crypt('bob-pw-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"email":"bob.martin@client-secret.fr","first_name":"Bob","last_name":"Martin"}',
  now(), now(), '', '', '', '');
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at) values
 ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"alice@maydai.io"}', 'email', now(), now()),
 ('bob.martin@client-secret.fr', '22222222-2222-2222-2222-222222222222',
  '{"sub":"22222222-2222-2222-2222-222222222222","email":"bob.martin@client-secret.fr"}', 'email', now(), now());
insert into auth.sessions (id, user_id, created_at) values (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', now());
insert into auth.audit_log_entries (id, payload, created_at) values (gen_random_uuid(), '{"actor_username":"bob.martin@client-secret.fr"}', now());

insert into public.companies (id, name, siren, street_address, city) values
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client Secret SAS', '552100554', '12 avenue Secrete', 'Paris'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MaydAI Demo', null, null, 'Paris');
insert into public.profiles (id, first_name, last_name, phone, siren, company_id, company_name, role, gclid) values
 ('22222222-2222-2222-2222-222222222222', 'Bob', 'Martin', '+33612345678', '552100554',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client Secret SAS', null, 'gclid-xyz'),
 ('11111111-1111-1111-1111-111111111111', 'Alice', 'Equipe', null, null,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MaydAI Demo', 'admin', null);
insert into public.user_companies (user_id, company_id, role) values
 ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner'),
 ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner');
insert into public.usecases (id, name, company_id, deployment_phase, input_telemetry) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Tri des CV', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'production',
  '{"contact":"bob.martin@client-secret.fr"}');
insert into public.usecase_responses (usecase_id, question_code, answered_by) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'E4.N7.Q1', 'bob.martin@client-secret.fr');
insert into public.usecase_history (usecase_id, user_id, event_type, new_value) values
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'update',
  'Responsable : bob.martin@client-secret.fr');
insert into public.leads (email, first_name, last_name, phone, company_name, gclid) values
 ('prospect@client-secret.fr', 'Paul', 'Prospect', '0611223344', 'Client Secret SAS', 'gclid-abc');
insert into public.contact_site (first_name, last_name, email, phone, message, subject) values
 ('Bob', 'Martin', 'bob.martin@client-secret.fr', '0612345678', 'Rappelez-moi au 0612345678', 'Autre demande');
insert into public.subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status) values
 ('22222222-2222-2222-2222-222222222222', 'cus_SECRET', 'sub_SECRET', 'active');
insert into public.procurements (id, user_id, title, supplier_emails) values
 ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'AO test',
  array['fournisseur@client-secret.fr']);
insert into public.procurement_suppliers (procurement_id, contact_email, company_name, siren) values
 ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'fournisseur@client-secret.fr', 'Fournisseur Secret', '552100554');
insert into public.admin_alerts (alert_type, siren, status, primary_profile_id, secondary_profile_id) values
 ('SIREN_COLLISION', '552100554', 'open', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');
insert into storage.buckets (id, name, public) values ('dossiers', 'dossiers', false);
insert into storage.objects (bucket_id, name) values ('dossiers', 'cccc/doc.pdf');
SQL

export SOURCE_CONTAINER=$SRC TARGET_CONTAINER=$DST SKIP_COMPOSE=1
export PREPROD_KEEP_EMAILS='@maydai\.io$' PREPROD_TEST_PASSWORD=$TEST_PW

echo "Garde-fou : refus d'écrire dans une base non preprod"
if SOURCE_CONTAINER=$DST TARGET_CONTAINER=$SRC ./preprod-db.sh refresh >/dev/null 2>&1; then
  fail "le refresh a accepté une cible non preprod"
fi
[ "$(psql_in $SRC -Atc 'select count(*) from public.usecases')" = 1 ] || fail "la fausse prod a été modifiée"
ok "cible non preprod refusée, fausse prod intacte"

echo "Rafraîchissement"
./preprod-db.sh refresh

DATA=$(docker exec $DST pg_dump -U supabase_admin -d postgres --data-only -n public -n auth -n storage 2>/dev/null)
for secret in client-secret.fr Martin 0612345678 0611223344 552100554 cus_SECRET gclid-xyz 'avenue Secrete' 'Client Secret' 'Fournisseur Secret'; do
  ! grep -q "$secret" <<<"$DATA" || fail "donnée prod encore présente : $secret"
done
ok "aucune donnée personnelle client restante"
grep -q 'alice@maydai.io' <<<"$DATA" || fail "compte équipe perdu"
q() { psql_in $DST -Atc "$1"; }
[ "$(q "select name from public.companies where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'")" = "MaydAI Demo" ] || fail "entreprise équipe renommée"
[ "$(q 'select count(*) from public.usecases')" = 1 ] || fail "cas d'usage perdus"
[ "$(q "select name from public.usecases")" = "Tri des CV" ] || fail "contenu du cas d'usage modifié"
[ "$(q 'select status from public.subscriptions')" = active ] || fail "plan perdu"
[ "$(q 'select count(*) from auth.sessions') $(q 'select count(*) from storage.objects') $(q 'select count(*) from storage.buckets')" = "0 0 1" ] \
  || fail "sessions / fichiers / buckets"
BOB=$(q "select email from auth.users where id = '22222222-2222-2222-2222-222222222222'")
[ "$(q "select answered_by from public.usecase_responses")" = "$BOB" ] || fail "réponses non rattachées au faux email"
[ "$(q "select p.role from public.profiles p join auth.users u on u.id = p.id where u.email = 'recette-admin@preprod.invalid'")" = admin ] \
  || fail "compte recette admin"
ok "équipe, contenus, plan, comptes de recette conservés ; sessions et fichiers vidés"

echo "Connexion GoTrue + capture des emails"
psql_in $DST -c "alter role supabase_auth_admin password 'test'"
docker run -d --name $MAIL --network $NET -p 127.0.0.1:18025:8025 axllent/mailpit:v1.21.8 >/dev/null
docker run -d --name $AUTH --network $NET -p 127.0.0.1:19999:9999 \
  -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://localhost:19999 \
  -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:test@$DST:5432/postgres \
  -e GOTRUE_SITE_URL=http://localhost:3000 -e GOTRUE_JWT_SECRET=$JWT -e GOTRUE_JWT_EXP=3600 \
  -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_OTP_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false \
  -e GOTRUE_SMTP_HOST=$MAIL -e GOTRUE_SMTP_PORT=1025 -e GOTRUE_SMTP_ADMIN_EMAIL=noreply@preprod.invalid \
  -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 supabase/gotrue:v2.164.0 >/dev/null
for _ in $(seq 60); do curl -sf http://localhost:19999/health >/dev/null && break; sleep 1; done
login() {
  curl -s -o /dev/null -w '%{http_code}' -X POST 'http://localhost:19999/token?grant_type=password' \
    -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}"
}
[ "$(login recette-admin@preprod.invalid $TEST_PW)" = 200 ] || fail "connexion compte recette"
[ "$(login alice@maydai.io alice-pw-123)" = 200 ] || fail "connexion compte équipe"
[ "$(login "$BOB" bob-pw-123)" = 400 ] || fail "le mot de passe client fonctionne encore"
ok "connexion recette et équipe OK, mot de passe client invalidé"
curl -sf -X POST http://localhost:19999/otp -H 'Content-Type: application/json' -d '{"email":"alice@maydai.io"}' >/dev/null \
  || fail "envoi du code de connexion"
sleep 1
[ "$(curl -s http://localhost:18025/api/v1/messages | python3 -c 'import json,sys; print(json.load(sys.stdin)["total"])')" -ge 1 ] \
  || fail "email non capturé par Mailpit"
ok "email de connexion capturé par Mailpit"

echo "Tous les tests passent."
