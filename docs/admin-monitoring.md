# Monitoring admin — disque, email, purges Docker

Page `/admin/monitoring` et API `GET` / `POST /api/admin/monitoring`. Durci en septembre 2026 (`verifyAdminAuth` puis allowlist des JSON hôte, `#436`). Vérifié contre `app/api/admin/monitoring/route.ts` et `lib/monitoring-source.ts`.

## 1. Intention

Donner aux admins un tableau de bord hôte (disque prod, dernier mail d’alerte, historique des purges Docker) **sans** exposer les JSON bruts sur Internet.

Deux garde-fous distincts :

1. La route Next : `verifyAdminAuth` (Bearer admin).
2. Les sources JSON : allowlist d’URL + en-tête d’auth (`resolveMonitoringFetchTarget`).

## 2. API

Auth : `verifyAdminAuth` (rôle `admin` ou `super_admin`). 401 / 403 / 404 comme les autres routes admin.

| Méthode | `action` | Effet |
|---------|----------|--------|
| `GET` | `stats` (défaut) | `errorMonitor` + disque + email + purges |
| `GET` | `disk` | disque + email + purges (sans stats erreurs) |
| `GET` | `errors` / `metrics` | logs in-process (`limit`, défaut 50) |
| `GET` | `export` | dump `errorMonitor` |
| `GET` / `POST` | `cleanup` | purge logs in-process (`days`, défaut 7) |
| `POST` | `check_issues` | `errorMonitor.checkForIssues()` |

Timeout fetch source : 15 s, `redirect: 'error'`, `cache: 'no-store'`.

## 3. Sources JSON (hôte OVH)

| Variable | Fichier typique | Consommateur |
|----------|-----------------|--------------|
| `MONITORING_PROD_DISK_JSON_URL` | `disk.json` | `getProductionDiskUsage` |
| `MONITORING_PROD_EMAIL_STATUS_JSON_URL` | `email-status.json` | `getProductionEmailStatus` |
| `MONITORING_PROD_DOCKER_PURGES_JSON_URL` | `docker-purges.json` | `getProductionDockerPurges` |

`isAllowedMonitoringSourceUrl` / `resolveMonitoringFetchTarget` (`lib/monitoring-source.ts`) :

| URL | Auth env | Résultat |
|-----|----------|----------|
| `http://127.0.0.1/…` ou `http://localhost/…` | aucune | OK (nginx localhost-only) |
| `https://monitoring.example.com/…` | `MONITORING_BEARER_TOKEN` **ou** `MONITORING_HTTP_USER` + `MONITORING_HTTP_PASSWORD` | OK (bearer prioritaire) |
| `http://` public (IP ou hostname) | même avec basic auth | **refusé** |
| `https://user:pass@host/…` | — | **refusé** (credentials dans l’URL) |
| HTTPS sans token / basic | — | **refusé** |

URL refusée ou absente → `Source monitoring non configurée`. En **dev** uniquement, le disque retombe sur `df -h /` de la machine locale. En prod : `disk: null` + `diskError`. Pas de fallback local pour les purges Docker.

JSON disque attendu : `total`, `used`, `free` (ou `available`), `usePercent`, `updatedAt`. Si `|total − (used+free)| > 12 %`, l’API recalcule total et % (`coherenceNote`).

## 4. Hôte (ne pas réouvrir)

Modèles dans `scripts/deploy/` :

| Fichier | Rôle |
|---------|------|
| `protect-ovh-monitoring.sh` | Audit SSH (`SUPABASE_OVH_SSH_HOST`) : Caddy public 404, nginx :8080 localhost-only |
| `caddy-monitoring-basicauth.caddy` | HTTPS + basic auth pour le fetch Vercel |
| `caddy-monitoring-localhost.caddy` | Variante loopback |
| `nginx-monitoring.conf` | `allow 127.0.0.1; deny all` **ou** `auth_basic` sur vhost HTTPS |

Vérifs attendues (depuis l’hôte vs Internet) : documentées dans `protect-ovh-monitoring.sh`. Jamais d’adresse IP dans le repo (`.env.example`).

## 5. Variables

| Variable | Usage |
|----------|--------|
| `MONITORING_PROD_*_JSON_URL` | Trois URLs ci-dessus |
| `MONITORING_BEARER_TOKEN` | `Authorization: Bearer …` (prioritaire) |
| `MONITORING_HTTP_USER` / `MONITORING_HTTP_PASSWORD` | Basic auth si pas de bearer |
| `SUPABASE_OVH_SSH_HOST` | Tunnel / script de protection (jamais d’IP commitée) |

## 6. Pièges

- **`verifyAdminAuth` ne suffit pas.** Une URL HTTP publique est ignorée même pour un admin connecté.
- **Pas de credentials dans l’URL.** Uniquement headers construits côté serveur.
- **Fallback `df` = dev only.** Un disque « local-runtime » en prod est un bug de config, pas une feature.
- **Purges** : tableau JSON ; les entrées mal typées sont filtrées, pas une 500.
- **Rapports E2E** : le workflow ne rsync plus de `playwright-report/` vers l’hôte (septembre 2026). Artifacts GitHub uniquement. Voir [e2e-playwright.md](./e2e-playwright.md).
