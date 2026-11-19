-- Anonymise une copie de la prod restaurée dans la base PREPROD (MAY-30).
-- Lancé par preprod-db.sh refresh, en une seule transaction (psql -1) :
-- si une étape ou le contrôle final échoue, rien n'est gardé et la preprod reste coupée.
--
-- Variables psql :
--   keep_emails    regex des emails d'équipe gardés tels quels (ex. '@maydai\.io$')
--   test_password  mot de passe des comptes de recette ('' = pas de comptes)

\set ON_ERROR_STOP on

-- Garde-fou : uniquement sur la base preprod (cluster_name posé par le docker-compose preprod).
do $$ begin
  if current_setting('cluster_name') <> 'maydai-preprod' then
    raise exception 'Base cible non preprod (cluster_name=%) : abandon', current_setting('cluster_name');
  end if;
end $$;

select set_config('preprod.keep_emails', :'keep_emails', true),
       set_config('preprod.test_password', :'test_password', true) \g /dev/null

-- Les triggers applicatifs (updated_at, rôles, historique) ne doivent pas réagir aux réécritures.
set local session_replication_role = replica;

-- ---------------------------------------------------------------------------
-- Fonctions (session uniquement, rien ne reste dans la base)
-- ---------------------------------------------------------------------------
create function pg_temp.is_team(e text) returns boolean language sql stable as
$$ select coalesce(e ~* current_setting('preprod.keep_emails'), false) $$;

create function pg_temp.is_kept(e text) returns boolean language sql stable as
$$ select pg_temp.is_team(e) or e ~* '@preprod\.invalid$' $$;

-- Même email d'origine → même faux email partout (auth, réponses, historique…).
create function pg_temp.fake_email(e text) returns text language sql immutable as
$$ select 'user-' || substr(md5(lower(e)), 1, 10) || '@preprod.invalid' $$;

-- Même SIREN d'origine → même faux SIREN (garde les rapprochements entre tables).
create function pg_temp.fake_siren(s text) returns text language sql immutable as
$$ select case when nullif(s, '') is null then s
          else lpad(((('x' || substr(md5(s), 1, 8))::bit(32)::bigint) % 1000000000)::text, 9, '0') end $$;

create function pg_temp.fake_label(prefix text, seed text) returns text language sql immutable as
$$ select case when seed is null then null else prefix || ' ' || substr(md5(seed), 1, 6) end $$;

-- Remplace tout email non gardé trouvé dans un texte (colonnes texte, json, tableaux).
create function pg_temp.scrub(s text) returns text language plpgsql stable as $$
declare m text;
begin
  if s is null or position('@' in s) = 0 then return s; end if;
  for m in select distinct (regexp_matches(s, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'g'))[1] loop
    if not pg_temp.is_kept(m) then s := replace(s, m, pg_temp.fake_email(m)); end if;
  end loop;
  return s;
end $$;

create function pg_temp.has_foreign_email(s text) returns boolean language plpgsql stable as $$
declare m text;
begin
  if s is null or position('@' in s) = 0 then return false; end if;
  for m in select (regexp_matches(s, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'g'))[1] loop
    if not pg_temp.is_kept(m) then return true; end if;
  end loop;
  return false;
end $$;

-- Colonnes texte / json / tableaux de texte du schéma public (balayage générique des emails).
create temp view text_columns as
select a.attrelid::regclass::text as tbl, a.attname as col, format_type(a.atttypid, a.atttypmod) as typ
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
  and a.attgenerated = ''
  and a.atttypid in ('text'::regtype, 'varchar'::regtype, 'json'::regtype, 'jsonb'::regtype,
                     'text[]'::regtype, 'varchar[]'::regtype);

-- Équipe = comptes dont l'email correspond à keep_emails (calculé avant toute réécriture).
create temp table team_users as
select id from auth.users where pg_temp.is_team(email);

-- ---------------------------------------------------------------------------
-- Auth : sessions et journaux vidés, comptes clients anonymisés et sans mot de passe
-- ---------------------------------------------------------------------------
truncate auth.sessions, auth.refresh_tokens, auth.mfa_amr_claims, auth.mfa_challenges,
         auth.flow_state, auth.saml_relay_states, auth.one_time_tokens, auth.audit_log_entries;

update auth.users set
  email = pg_temp.scrub(email),
  email_change = pg_temp.scrub(email_change),
  phone = null,
  phone_change = '',
  raw_user_meta_data = pg_temp.scrub(raw_user_meta_data::text)::jsonb
    - array['first_name', 'last_name', 'given_name', 'family_name', 'full_name', 'name', 'phone', 'avatar_url', 'picture'],
  encrypted_password = '',
  confirmation_token = '', recovery_token = '', email_change_token_new = '',
  email_change_token_current = '', reauthentication_token = '', phone_change_token = ''
where id not in (select id from team_users);

update auth.identities set
  provider_id = pg_temp.scrub(provider_id),
  identity_data = pg_temp.scrub(identity_data::text)::jsonb
    - array['first_name', 'last_name', 'given_name', 'family_name', 'full_name', 'name', 'phone', 'avatar_url', 'picture']
where user_id not in (select id from team_users);

-- ---------------------------------------------------------------------------
-- Données clients : noms, téléphones, SIREN, Stripe, tracking
-- ---------------------------------------------------------------------------
update public.profiles set
  first_name = case when first_name is null then null else 'Test' end,
  last_name = pg_temp.fake_label('Utilisateur', id::text),
  phone = null,
  company_name = pg_temp.fake_label('Entreprise', company_name),
  siren = pg_temp.fake_siren(siren),
  gclid = null, utm_source = null, utm_medium = null, utm_campaign = null
where id not in (select id from team_users);

-- Une entreprise garde son nom seulement si tous ses membres sont dans l'équipe.
with links as (
  select company_id, user_id from public.user_companies
  union select company_id, id from public.profiles where company_id is not null
)
update public.companies c set
  name = pg_temp.fake_label('Entreprise', c.id::text),
  street_address = case when street_address is null then null else '1 rue de la Recette' end,
  siren = pg_temp.fake_siren(siren)
where not exists (select 1 from links l where l.company_id = c.id)
   or exists (select 1 from links l where l.company_id = c.id and l.user_id not in (select id from team_users));

update public.companies set deletion_token_hash = null;
update public.usecases set deletion_token_hash = null;

update public.leads set
  first_name = case when first_name is null then null else 'Test' end,
  last_name = pg_temp.fake_label('Prospect', id::text),
  phone = null,
  company_name = pg_temp.fake_label('Entreprise', company_name),
  gclid = null, click_id = null;

update public.contact_requests set
  full_name = 'Contact anonymisé', phone = null,
  message = case when message is null then null else 'Message anonymisé (preprod)' end;

update public.contact_site set
  first_name = 'Contact', last_name = 'Anonymisé', phone = null,
  message = case when message is null then null else 'Message anonymisé (preprod)' end;

update public.procurement_suppliers set
  company_name = pg_temp.fake_label('Fournisseur', company_name),
  siren = pg_temp.fake_siren(siren);

-- Le plan reste, le lien avec Stripe disparaît (la preprod tourne avec les clés de test).
update public.subscriptions set stripe_customer_id = null, stripe_subscription_id = null;

truncate public.admin_alerts, public.user_device_sessions, public.google_ads_offline_import_dedup;

-- Fichiers clients non copiés : on retire leurs références (les buckets restent).
delete from storage.objects;

-- Balayage générique : tout email non gardé restant dans public (réponses, historique, json…).
do $$
declare r record;
begin
  for r in select * from text_columns loop
    execute format('update %s set %I = pg_temp.scrub(%I::text)::%s where %I::text like ''%%@%%''',
                   r.tbl, r.col, r.col, r.typ, r.col);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Comptes de recette (mot de passe = test_password)
-- ---------------------------------------------------------------------------
do $$
declare
  acc record;
  uid uuid;
  pw text := current_setting('preprod.test_password');
begin
  if pw = '' then
    raise notice 'test_password vide : pas de comptes de recette';
    return;
  end if;
  for acc in select * from (values
    ('recette-admin@preprod.invalid', 'Admin', 'admin'),
    ('recette-user@preprod.invalid', 'Utilisateur', null)
  ) v(email, label, role) loop
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', acc.email,
      extensions.crypt(pw, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('email', acc.email, 'email_verified', true),
      now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values (uid::text, uid,
      jsonb_build_object('sub', uid::text, 'email', acc.email, 'email_verified', true, 'phone_verified', false),
      'email', now(), now());
    insert into public.profiles (id, first_name, last_name, role) values (uid, 'Recette', acc.label, acc.role);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Contrôle final : plus aucun email hors équipe. Sinon la transaction est annulée.
-- ---------------------------------------------------------------------------
do $$
declare r record; n bigint; leaks text := '';
begin
  for r in
    select tbl, col from text_columns
    union all values ('auth.users', 'email'), ('auth.users', 'raw_user_meta_data'),
                     ('auth.identities', 'identity_data'), ('auth.identities', 'provider_id')
  loop
    execute format('select count(*) from %s where pg_temp.has_foreign_email(%I::text)', r.tbl, r.col) into n;
    if n > 0 then leaks := leaks || format(' %s.%s (%s)', r.tbl, r.col, n); end if;
  end loop;
  if leaks <> '' then
    raise exception 'Emails non anonymisés :%', leaks;
  end if;
end $$;

select format('Anonymisation OK : %s comptes (%s équipe), %s entreprises, %s cas d''usage',
  (select count(*) from auth.users), (select count(*) from team_users),
  (select count(*) from public.companies), (select count(*) from public.usecases)) as resultat;
