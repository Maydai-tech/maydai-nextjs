# Hub canonique des modèles LLM

Comment MaydAI identifie un modèle, relie les sources externes, et synchronise les catalogues. Règle Cursor (interdiction de dénormaliser) : `.cursor/rules/llm-models-hub.mdc`.

## 1. Intention

Une fiche = une ligne `compl_ai_models` (id, **slug**, nom, provider, métadonnées).  
Les identifiants LLM Stats / EcoLogits / Compar:IA vivent **uniquement** dans `llm_model_source_ids`.

Matching inter-sources : `source_id` → `slug` → nom. Jamais l’inverse comme clé primaire.

```sql
-- Interdit
alter table public.compl_ai_models add column llm_stats_id text;

-- Autorisé
insert into public.llm_model_source_ids (model_id, source, source_id, match_method)
values ('…', 'comparia', 'gpt-4o', 'exact');
-- source ∈ llm_stats | ecologits | comparia
-- match_method ∈ exact | slug | manual
```

Slug JS = `normalizeLlmModelSlug` (`lib/bench-llm/model-slug.ts`), équivalent SQL `normalize_llm_model_slug` : minuscules, non-alphanum → tiret.

## 2. Tables

| Table | Rôle |
|-------|------|
| `compl_ai_models` | Fiche canonique (admin Bench LLM) |
| `llm_model_source_ids` | Pivot `(source, source_id)` unique → `model_id` |
| `comparia_models` | Catalogue Compar:IA (scores, `is_active`) |
| `comparia_import_runs` | Historique d’import |
| `llm_stats_sync_runs` | Historique cron LLM Stats |

RLS : lecture `llm_model_source_ids` limitée aux admins (`is_admin_or_super_admin`). Écritures : `service_role`.

## 3. Synchronisations (ops)

Déclarées dans `vercel.json` :

| Job | Chemin | Horloge (UTC) | Auth |
|-----|--------|---------------|------|
| LLM Stats | `GET /api/cron/sync-llm-stats` | `30 2 * * *` | `Authorization: Bearer $CRON_SECRET` |
| EcoLogits | `GET /api/cron/sync-ecologits` | `0 3 * * *` | idem |
| Compar:IA Drive | `GET /api/admin/comparia/sync` | `0 2 * * 0` (dimanche) | cron **ou** admin |

Compar:IA accepte aussi `x-cron-secret: $CRON_SECRET` (comparaison `timingSafeEqual`).  
`GET` = cron only. `POST` = cron **ou** `verifyAdminAuth` (admin). Body optionnel `{ "file_name": "…" }`.

Durées Vercel : LLM Stats 60 s ; EcoLogits / Compar:IA 300 s.

### Webhook Drive (Hermes)

`POST /api/webhooks/kb-update` — header `x-api-key: $INTERNAL_API_KEY`.

| `folder_name` | Action |
|---------------|--------|
| `05_AI_Act_Docs` | Ingestion RAG ([ai-act-rag.md](./ai-act-rag.md)) — ignore `file_name` |
| autre | Télécharge le CSV nommé `file_name` depuis Drive → `persistCompariaCatalog` |

CSV Compar:IA attendu : `leaderboard.csv` par défaut (`COMPARIA_DRIVE_FILE_NAME` ou argument). Le script `test-webhook.sh` envoie un exemple `comparia_ranking_*.csv` : adapter le nom au fichier réel du Shared Drive.

### Codepaths

| Source | Écriture pivot | Entrée |
|--------|----------------|--------|
| LLM Stats | `lib/bench-llm/llm-stats-sync.ts` | cron + admin `/api/admin/llm-stats-sync-runs` |
| EcoLogits | `lib/ecologits/sync.ts` | cron + `/api/admin/ecologits/sync` |
| Compar:IA | `lib/comparia/catalog-sync.ts` | cron, POST admin, webhook KB |

Admin Bench : `lib/bench-llm/admin-unified.ts` — une ligne par fiche, badges via le pivot (pas de colonnes `llm_stats_id` / `eco_*` sur le hub).

## 4. Variables

| Variable | Usage |
|----------|--------|
| `CRON_SECRET` | Tous les crons ; Compar:IA GET refuse si absent |
| `LLM_STATS_API_KEY` | Obligatoire pour le cron Stats |
| `LLM_STATS_BASE_URL` | Défaut `https://api.llm-stats.com/stats` |
| `ECOLOGITS_BASE_URL` / `ECOLOGITS_API_KEY` | Catalogue + estimations |
| `COMPARIA_DRIVE_FILE_NAME` | Défaut `leaderboard.csv` |
| `GOOGLE_DRIVE_*` | Service Account Shared Drive |
| `INTERNAL_API_KEY` | Webhook KB + sync SIREN |

## 5. Relier un modèle à la main

1. Ouvrir `/admin/bench-llms` (fiche unique, pas de doublon source).
2. Insérer une ligne pivot `source` + `source_id` + `match_method = 'manual'`.
3. Ne pas recréer une fiche `compl_ai_models` pour « rattacher » une source orpheline.

Matching Compar:IA automatique (`findCompariaHubLinks`) : id LLM Stats déjà pivoté, puis slug, puis nom.

## 6. Pièges

- Une source orpheline n’est **pas** une raison d’ajouter une colonne sur `compl_ai_models`.
- `matchComplAiModelId` (chat setup) fait un `ILIKE` sur `model_name` uniquement — pas le slug. Ambigu ou absent → `primary_model_id` null.
- Docs historiques [PERPLEXITY_MODELS_IMPLEMENTATION.md](./PERPLEXITY_MODELS_IMPLEMENTATION.md) et [ENRICHISSEMENT_MODELS_IMPLEMENTATION.md](./ENRICHISSEMENT_MODELS_IMPLEMENTATION.md) : chemins admin anciens. Nouvelles APIs : `/api/admin/bench-llms` et `/api/admin/bench-llms/models/[id]`.
- Cron Compar:IA : un `x-cron-secret` **faux** est rejeté même si un Bearer admin est présent (`hasRejectedCronSecret`).
