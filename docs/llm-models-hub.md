# Hub canonique des modèles LLM

Comment MaydAI identifie un modèle, relie les sources externes, et synchronise les catalogues. Règle Cursor (interdiction de dénormaliser) : `.cursor/rules/llm-models-hub.mdc`.

## 1. Intention

Une fiche = une ligne `compl_ai_models` (id, **slug**, nom, provider, métadonnées).  
Les identifiants LLM Stats / Compar:IA vivent **uniquement** dans `llm_model_source_ids`. EcoLogits runtime : table `ecologits_model_links` (le pivot *peut* porter `source = 'ecologits'` pour un badge ; le cron n’y écrit pas).

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

| Table / colonne | Rôle |
|-----------------|------|
| `compl_ai_models` | Fiche canonique (admin Bench LLM) |
| `compl_ai_models.lifecycle_status` | Override admin CSV : `active` \| `deprecated` \| `retired` \| `legacy`. `NULL` = snapshot fournisseur officiel. **Pas** un identifiant de source. |
| `compl_ai_evaluations` | Un score COMPL-AI par `(model_id, benchmark_id)` |
| `llm_model_source_ids` | Pivot `(source, source_id)` unique → `model_id` (`llm_stats` \| `ecologits` \| `comparia`) |
| `ecologits_models` | Catalogue EcoLogits (`is_active` = présence catalogue, **pas** le cycle de vie) |
| `ecologits_model_links` | Lien EcoLogits → fiche MaydAI (unique sur `ecologits_model_id`) |
| `comparia_models` | Catalogue Compar:IA (scores, `is_active`) |
| `comparia_import_runs` | Historique d’import |
| `llm_stats_sync_runs` | Historique cron LLM Stats |

RLS : lecture `llm_model_source_ids` limitée aux admins (`is_admin_or_super_admin`). Écritures : `service_role`.

`lifecycle_status` est une métadonnée de fiche (migration `20260919120000_…`). Ce n’est **pas** une colonne dénormalisée de source externe — l’interdiction du hub reste : pas de `llm_stats_id` / `eco_*` sur `compl_ai_models`.

## 3. Synchronisations (ops)

Déclarées dans `vercel.json` :

| Job | Chemin | Horloge (UTC) | Auth |
|-----|--------|---------------|------|
| LLM Stats | `GET /api/cron/sync-llm-stats` | `0 4 * * 3` (mercredi) | `Authorization: Bearer $CRON_SECRET` |
| EcoLogits | `GET /api/cron/sync-ecologits` | `0 3 * * *` | idem |
| Compar:IA Drive | `GET /api/admin/comparia/sync` | `0 2 * * 0` (dimanche) | cron **ou** admin |

System Cards / Tour de contrôle : **pas** de cron — boutons admin uniquement. Runbook : [llm-system-cards.md](./llm-system-cards.md).

Compar:IA accepte aussi `x-cron-secret: $CRON_SECRET` (comparaison `timingSafeEqual`).  
`GET` = cron only. `POST` = cron **ou** `verifyAdminAuth` (admin). Body optionnel `{ "file_name": "…" }`.

Durées Vercel : LLM Stats / Control Tower 60 s ; EcoLogits / Compar:IA / import System Cards 300 s.

### Webhook Drive (Hermes)

`POST /api/webhooks/kb-update` — header `x-api-key: $INTERNAL_API_KEY`.

| `folder_name` | Action |
|---------------|--------|
| `05_AI_Act_Docs` | Ingestion RAG ([ai-act-rag.md](./ai-act-rag.md)) — ignore `file_name` |
| autre | Télécharge le CSV nommé `file_name` depuis Drive → `persistCompariaCatalog` |

CSV Compar:IA attendu : `leaderboard.csv` par défaut (`COMPARIA_DRIVE_FILE_NAME` ou argument). Le script `test-webhook.sh` envoie un exemple `comparia_ranking_*.csv` : adapter le nom au fichier réel du Shared Drive.

### Codepaths

| Source | Table d’écriture | Entrée |
|--------|------------------|--------|
| LLM Stats | pivot `llm_model_source_ids` | cron + admin `/api/admin/llm-stats-sync-runs` |
| EcoLogits | `ecologits_model_links` (**pas** le pivot) | cron + `/api/admin/ecologits/sync` + `PUT /api/admin/ecologits/models/[id]/link` |
| Compar:IA | `comparia_models` + pivot | cron, POST admin, webhook KB |
| COMPL-AI scores | `compl_ai_evaluations` (+ `lifecycle_status` sur la fiche) | CSV admin §7 |

Le cron EcoLogits (`lib/ecologits/sync.ts` → `planExactEcoLogitsLinks`) ne crée un lien `exact` que s’il reste **un** MaydAI libre pour la clé provider+nom, et **refuse** un 2ᵉ EcoLogits sur une fiche déjà liée. Le rattachement de plusieurs alias (dated / latest) se fait à la main (`match_method = 'manual'`). Unique côté EcoLogits : `onConflict: 'ecologits_model_id'`. Unique côté MaydAI : **levée** (`20260919100000_…`).

Admin Bench : `lib/bench-llm/admin-unified.ts` — une ligne par fiche. Badge EcoLogits = lien `ecologits_model_links` **ou** pivot `source = 'ecologits'`. Pas de colonnes `llm_stats_id` / `eco_*` sur le hub.

System Cards : table séparée `llm_system_cards.model_identifier` = slug. Pas une source du pivot, pas une colonne sur `compl_ai_models`. Voir [llm-system-cards.md](./llm-system-cards.md).

## 4. Variables

| Variable | Usage |
|----------|--------|
| `CRON_SECRET` | Tous les crons ; Compar:IA GET refuse si absent |
| `LLM_STATS_API_KEY` | Obligatoire pour le cron Stats |
| `LLM_STATS_BASE_URL` | Défaut `https://api.llm-stats.com/stats` |
| `ECOLOGITS_BASE_URL` / `ECOLOGITS_API_KEY` | Catalogue + estimations |
| `COMPARIA_DRIVE_FILE_NAME` | Défaut `leaderboard.csv` |
| `GOOGLE_DRIVE_*` | Service Account Shared Drive |
| `GOOGLE_SHEETS_CONTROL_TOWER_ID` | Sheet Tour de contrôle (import System Cards + write-back `Statut LLM`) |
| `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` | Dossier CSV snapshot (export Control Tower) |
| `GOOGLE_DRIVE_FOLDER_ID` | Dossier du script de suivi Sheets (§8) — **pas** le dossier Control Tower |
| `INTERNAL_API_KEY` | Webhook KB + sync SIREN |

## 5. Relier un modèle à la main

1. Ouvrir `/admin/bench-llms` (fiche unique, pas de doublon source).
2. LLM Stats / Compar:IA : insérer une ligne pivot `source` + `source_id` + `match_method = 'manual'`.
3. EcoLogits : `PUT /api/admin/ecologits/models/{ecoId}/link` body `{ "maydaiModelId": "<uuid>" }`. Body sans id → unlink (delete des lignes de cet `ecologits_model_id`). 404 si l’un des deux ids est inconnu.
4. Ne pas recréer une fiche `compl_ai_models` pour « rattacher » une source orpheline.

Matching Compar:IA automatique (`findCompariaHubLinks`) : id LLM Stats déjà pivoté, puis slug, puis nom.

## 6. Cycle de vie fournisseur

Ce n’est **pas** `ecologits_models.is_active` (présence catalogue). Snapshot officiel dans `lib/bench-llm/provider-lifecycle.ts` (daté dans le fichier, ex. 2026-09-22) : Anthropic, OpenAI, Google, Mistral, xAI.

| Statut | Label CSV / UI |
|--------|----------------|
| `active` | Actif |
| `legacy` | Legacy |
| `deprecated` | Déprécié |
| `retired` | Retiré |

`resolveProviderLifecycle(identifiants)` normalise (minuscules, non-alphanum → tiret), matche l’id exact ou une variante datée `id-YYYYMMDD`, et garde le **pire** statut si plusieurs ids matchent (`retired` > `deprecated` > `legacy` > `active`).

`applyLifecycleStatusOverride(officiel, compl_ai_models.lifecycle_status)` : si la colonne CSV est renseignée, elle **remplace** le statut (le label aussi). Source affichée : `csv` si aucun match officiel.

Consommateurs : dashboard `/admin/bench-llms`, export COMPL-AI, colonne `Statut LLM` de la Tour de contrôle (`resolveControlTowerLlmStatus`).

## 7. CSV COMPL-AI (une ligne par modèle)

Saisie admin depuis `/admin/bench-llms`. Parser : `lib/bench-llm/compl-ai-csv.ts`.

| Action | Route | Auth | Durée |
|--------|-------|------|-------|
| Import | `POST /api/admin/compl-ai/import-csv` | `verifyAdminAuth` | 300 s |
| Template | `GET /api/admin/compl-ai/import-csv` | `verifyAdminAuth` | — |
| Export | `GET /api/admin/compl-ai/export-csv` | Bearer + rôle `admin` / `super_admin` (JWT, pas service role) | — |

Body import : `{ "csvData": [ {…colonnes} ], "updateMode": "update" }`. `updateMode === 'update'` **ou** `true` : écrase les scores existants. Sinon les évaluations déjà présentes sont ignorées (warning).

### Format large (canonique)

Une ligne = un modèle. Identité puis **une colonne par code benchmark** (`bbq`, `human_eval`, …) :

```
Modèle ID,Nom du Modèle,Fournisseur,Type,Version,Statut,bbq,human_eval
<uuid>,Mistral Large 3,Mistral,llm,,Actif,,0.3
```

BOM UTF-8. Séparateur `,` sauf si la 1ʳᵉ ligne n’a que des `;`. Scores **entre 0 et 1** (pas 0–100). Cellule vide / `N/A` / `na` → pas de score. Date d’évaluation absente en large : date déjà en base, sinon aujourd’hui (`YYYY-MM-DD`). `data_source = 'csv-import'`.

Matching modèle : UUID d’export d’abord, sinon `model_name` exact. Sans match → insert (l’UUID d’export est réutilisé si fourni).

### Format long (toujours accepté)

Si `Principe Code` ou `Benchmark Code` est présent, une ligne = un score. Conservé pour les anciens exports.

### Statut CSV

Alias (accents ignorés) : Actif / Active → `active` ; Déprécié / Deprecated → `deprecated` ; Retiré / Retired → `retired` ; Legacy → `legacy`. **`Évalué` n’est pas un statut** → ignoré (`null`).

### Après import

Chaque modèle dont au moins un score a été créé/mis à jour déclenche `recalculateUseCaseScoresForModel`. Un échec de recalcul = warning, l’import reste OK. HTTP : 400 fichier vide ; 422 aucun score sauvé ; 200 succès ou partiel.

Export : pagination 1000 ; en cas de doublon `(model, benchmark)` garde l’évaluation la plus récente (`evaluation_date`, puis `id`). Statut exporté = `lifecycle_status` **ou** snapshot officiel (slug + nom).

## 8. Export suivi Google Sheets (manuel)

Pas un cron Vercel. Script ops : `scripts/export_sync_tracking_to_gsheets.py`.

Une ligne par modèle (pas d’agrégat fournisseur). Classeur `MaydAI — Synchronisation LLM`, onglet `Synchronisation` : **réécrit à chaque run**.

```bash
python3 -m pip install gspread google-auth gspread-formatting
python3 scripts/export_sync_tracking_to_gsheets.py --dry-run
python3 scripts/export_sync_tracking_to_gsheets.py \
  --folder "https://drive.google.com/drive/folders/FOLDER_ID"
```

Auth : même compte de service Drive (`GOOGLE_DRIVE_CLIENT_EMAIL` + `GOOGLE_DRIVE_PRIVATE_KEY` dans `.env.local`), ou `--credentials`. Dossier : `--folder` ou `GOOGLE_DRIVE_FOLDER_ID` (ID nu ou URL). Partager le dossier en **Éditeur** avec le SA.

Catalogue lu : `compl_ai_models` + évaluations + liens EcoLogits / Compar:IA / pivot / System Cards. Cycle de vie : parse le même `provider-lifecycle.ts`. Fournisseurs suivis par défaut : Anthropic, DeepSeek, Google, Meta, Microsoft, Mistral, OpenAI, Perplexity, Qwen, xAI. Les autres sont ignorés sauf `--all-providers`.

## 9. Pièges

- Une source orpheline n’est **pas** une raison d’ajouter une colonne sur `compl_ai_models`.
- EcoLogits : le cron n’écrit **pas** `llm_model_source_ids`. Plusieurs alias → lien **manuel**. La fiche détail (`GET /api/admin/bench-llms/models/[id]`) fait un `.maybeSingle()` sur `maydai_model_id` : 2+ liens → erreur PostgREST. Le dashboard unifié garde le **dernier** EcoLogits vu pour `ecoModelId`.
- CSV mal recollé : UUID dans « Nom du modèle » et nom dans « Fournisseur » → le parser promote l’UUID et récupère le nom.
- Score CSV hors `[0, 1]` → ligne rejetée. Import « succès » avec 0 score = 422 (ne plus afficher un faux 200).
- `matchComplAiModelId` (chat setup) fait un `ILIKE` sur `model_name` uniquement — pas le slug. Ambigu ou absent → `primary_model_id` null.
- Docs historiques [PERPLEXITY_MODELS_IMPLEMENTATION.md](./PERPLEXITY_MODELS_IMPLEMENTATION.md) et [ENRICHISSEMENT_MODELS_IMPLEMENTATION.md](./ENRICHISSEMENT_MODELS_IMPLEMENTATION.md) : chemins admin anciens. Nouvelles APIs : `/api/admin/bench-llms` et `/api/admin/bench-llms/models/[id]`.
- Cron Compar:IA : un `x-cron-secret` **faux** est rejeté même si un Bearer admin est présent (`hasRejectedCronSecret`).
