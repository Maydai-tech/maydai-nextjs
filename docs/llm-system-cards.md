# System Cards LLM — dossiers, score et Tour de contrôle

Fiches d’audit GPAI (5 piliers) rattachées au **slug** canonique, pas à une colonne de `compl_ai_models`. Hub : [llm-models-hub.md](./llm-models-hub.md). Règle : `.cursor/rules/llm-models-hub.mdc`.

Livré en septembre 2026 (`#430`, `#431`, `#432`). Sync Sheet : `#447` (octobre 2026). Vérifié contre le code de ces chemins.

## 1. Intention

Donner à un cas d’usage dont le modèle a une fiche :

1. une analyse MaydAI préchargée par pilier (dossier) ;
2. un bonus de score 50 / 50 (préremplissage + compléments entreprise) ;
3. une section PDF une fois le préremplissage validé ;
4. un aller-retour Drive (Tour de contrôle Hermes) pour importer le Markdown source.

Ce n’est **pas** une source du pivot `llm_model_source_ids`. `model_identifier` = `compl_ai_models.slug`.

## 2. Tables

| Table / colonne | Rôle |
|-----------------|------|
| `llm_system_cards` | Une fiche par `model_identifier` (unique). Seed : `claude-sonnet-4-5`. |
| `llm_system_card_pillars` | 5 piliers / fiche, unique `(system_card_id, pillar_code)`. |
| `dossier_documents.system_card_pillar_id` | Lien optionnel vers le pilier. |
| `dossier_documents.maydai_prefill_applied` | Flag 50 % MaydAI. |
| `dossier_documents.user_completion_applied` | Flag 50 % entreprise. |

RLS : `SELECT` pour `authenticated`. Écritures : `service_role`.

Piliers (`SystemCardPillarCodeSchema`) et `doc_type` dossier :

| `pillar_code` | `doc_type` |
|---------------|------------|
| `doc_technique` | `technical_documentation` |
| `data_governance` | `data_quality` |
| `prompts_guardrails` | `system_prompt` |
| `risk_management` | `risk_management` |
| `surveillance_plan` | `continuous_monitoring` |

L’enum Postgres `doc_status` n’a pas d’état « partiel » : un seul flag → `incomplete` ; les deux → `complete`.

### Colonnes écrites par l’import Drive

L’upsert (`importSystemCardsFromControlTower`) écrit aussi `source_markdown`, `source_file_name`, `card_version_date`, `card_version_date_is_approx`, `card_date_label`, `card_month`.

Migrations **visibles dans le dépôt** : `source_markdown` (`20260909160000_…`) et `card_version_date_is_approx` (`20260910120000_…`). Les autres colonnes n’ont pas de `ALTER` listé — vérifier le schéma live avant un apply from scratch.

## 3. Ops admin (pas de cron Vercel)

Boutons sur `/admin/bench-llms`. Auth : `verifyAdminAuth` (Bearer admin). Pas d’entrée dans `vercel.json` → `crons`.

| Action | Route | Durée | Effet |
|--------|-------|-------|--------|
| Sync LLM Control | `POST /api/admin/llm-control-tower-sync` | 60 s | Append les modèles hub absents du Sheet, réécrit `Statut LLM`, exporte le CSV Drive |
| Import System Cards | `POST /api/admin/llm-system-cards-import` | 300 s | Lit le **Google Sheet**, importe les lignes `Prêt pour import = Oui` |

### Sync LLM Control (Sheet puis CSV)

`POST /api/admin/llm-control-tower-sync` (`lib/bench-llm/control-tower-csv.ts`), bouton « Sync LLM Control ». Body vide. `GOOGLE_SHEETS_CONTROL_TOWER_ID` est **obligatoire** (sinon 500 `GOOGLE_SHEETS_CONTROL_TOWER_ID is not defined`).

Ordre après `verifyAdminAuth` :

1. `appendMissingModelsToSheet` — lit la colonne A du **premier onglet** (index le plus bas). Présents = UUID `compl_ai_models.id` (en-tête détecté si la 1ʳᵉ cellule non vide fold en `id supabase`). Ajoute une ligne `A:M` par id manquant. Sheet vide → écrit d’abord l’en-tête. **N’update pas** les lignes déjà présentes (provider / nom / action Hermes restent ceux d’Hermes).
2. `writeControlTowerLlmStatusColumn` — réécrit toute la colonne `Statut LLM` (insert après `Statut Fiche Technique` si absente). Matching : colonne A = `id` Supabase.
3. `exportControlTowerCsv` — upsert `MaydAI_LLM_Control_Tower.csv` via `upsertTextFileInFolder`. Dossier : `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` ou constante `CONTROL_TOWER_FOLDER_ID`. Réécrit `Statut LLM` une 2ᵉ fois (même Sheet).

200 : `{ success, message, fileId, rowCount, updated, modelsAppended }`. Append + write-back Sheet peuvent réussir **avant** un échec Drive (500 partiel).

Nouvelle ligne (`buildControlTowerSheetRow`) : `Statut Supabase = Importé` ; fiche `Générée` / `Manquante` ; action Hermes `NONE` / `CREATE` ; prêt `Déjà importé` / `Non` ; lien Markdown vide ; dossier Drive = constante `CONTROL_TOWER_DRIVE_FOLDER_URL`.

Colonnes (13) : ID Supabase, provider, nom, nom Hermes (`slug` avec `_`), statuts, lien dossier, date MAJ, action Hermes, prêt. Hub data : page `compl_ai_models` (1000 / page) + `hasSystemCard` si `llm_system_cards.model_identifier === slug`.

`Statut LLM` (`resolveControlTowerLlmStatus`) : snapshot `provider-lifecycle.ts` (slug, nom, ids pivot) **surchargé** par `compl_ai_models.lifecycle_status` si renseigné. Hub : [llm-models-hub.md](./llm-models-hub.md) §6.

### Import Markdown (Sheet → Supabase)

`importSystemCardsFromControlTower` (`lib/bench-llm/system-cards-import.ts`) :

1. Télécharge `GOOGLE_SHEETS_CONTROL_TOWER_ID` (export CSV si Spreadsheet, sinon `files.get`).
2. Garde uniquement `Prêt pour import` égal à `oui` (insensible à la casse, après trim).
3. Résout le Markdown : URL / id Drive (`files.get`) **ou** nom de fichier dans le dossier **hardcodé** `CONTROL_TOWER_FOLDER_ID` (l’env d’export n’est **pas** utilisé ici).
4. Date de version : motif `YYYY-MM-DD` dans le **nom Drive**. Jour `XX` / `xx` / `??` → jour `01` + `card_version_date_is_approx = true`.
5. Label `Date de la fiche : …` lu dans le Markdown → `card_date_label`. `card_month` = 1er du mois (`normalizeCardMonth` / `resolveCardMonth`). **Ne pilote pas** le skip de version.
6. Slug : `compl_ai_models.id` si UUID, sinon nom Hermes, sinon nom modèle (`normalizeLlmModelSlug`).
7. Skip si une fiche existe déjà avec `card_version_date` **strictement plus récente**, sauf deux dates approximatives du **même mois** (upsert + warning).
8. Upsert **uniquement** `llm_system_cards`. **Aucun** insert dans `llm_system_card_pillars`.
9. Réécrit le Sheet : `Statut Supabase`, et si succès `Prêt pour import = Déjà importé`, `Action requise par Hermes = NONE`.

HTTP import : `200` si `errors` vide ; `207` si insert + erreurs ; `500` si erreurs et `inserted === 0`. Le write-back Sheet en échec est logué, pas fatal.

Deux artefacts Drive distincts : le **CSV snapshot** (export, pas lu par l’import) et le **Sheet** (import + statuts + append sync). La sync **écrit** les nouvelles lignes hub sur le Sheet que l’import lit. Ne pas confondre le fichier CSV Drive avec le Spreadsheet.

### Dates de fiche (`card_month`)

`card_month` est toujours le **1er du mois** (YYYY-MM-01), jamais le jour exact.

| Source | Parseur | Exemples → `card_month` |
|--------|---------|-------------------------|
| Label Markdown | `normalizeCardMonth` | `19/08/2026`, `1/8/2026`, `19-08-2026` → `2026-08-01` ; `Juin 2024` / `Février 2026` → 1er du mois ; `XX/10/2025`, `2025-10-XX` → `2025-10-01` |
| Nom Drive | `cardMonthFromVersionDate` | fallback si le label est absent ou illisible (`2025-XX-10`, mois 13, jour 32) |

Le label **prime** sur le nom de fichier (`19/08/2026` + fichier `2024-06-20` → `2026-08-01`). Le skip de version reste calé sur `card_version_date` du **nom Drive**, pas sur `card_month`.

## 4. Produit (dossiers, score, PDF)

Identifiant modèle côté UI / PDF : `compl_ai_models.slug`, sinon `usecases.llm_model_version`.

```
GET  /api/system-cards/{modelIdentifier}/pillars/{pillarCode}   Bearer user
POST /api/dossiers/pillar-completion                            Bearer + user_companies
```

`GET` : 401 sans Bearer ; 400 si code inconnu ; `{ pillar: null }` si pas de ligne.

`POST` body (Zod) : `usecaseId`, `pillarCode`, au moins un des flags `applyMaydaiPrefill` / `applyUserCompletion` (**`true` ou `false`**) ; `dossierId` optionnel (créé si absent) ; `userNotes` (max 20 000) persisté dans `form_data.system_card_notes` seulement si `applyUserCompletion` est truthy.

`updateDossierPillarCompletion` (`lib/services/system-card-service.ts`) :

- upsert `dossier_documents` sur `(dossier_id, doc_type)` ;
- flag omis → conserve la valeur déjà en base ;
- `complete` (les deux flags) → `syncTodoActionToResponse(…, 'system-card')` (échec sync logué, pas bloquant) ;
- rollback `complete` → `incomplete` (un flag repasse à `false`) → `reverseTodoActionResponse(…, 'system-card')`, **même contrat** que `POST /api/dossiers/[usecaseId]/[docType]` (échec reverse logué, pas bloquant) ;
- 50 % seul (un flag) : ni sync ni reverse ;
- recalcule le score (`calculateAndPersistUseCaseScore`).

Sans le reverse, l’UI affiche « incomplet » mais la question déclarative resterait au code positif et le score resterait gonflé.

UI : `SystemCardPillarTab` sur `/dashboard/[id]/dossiers/[usecaseId]`. Sans pilier en base, l’onglet System Card n’a rien à afficher (import Markdown seul ≠ piliers).

### Bonus score

`lib/system-card-score-bonus.ts` dans `lib/usecase-score-service.ts` :

- ignoré si le cas est éliminé, ou si le `doc_type` n’est pas un pilier, ou si les questions déclaratives du mapping todo sont déjà à 100 % (évite le double comptage après sync) ;
- +50 % des `expectedPointsGained` par flag (`maydai_prefill_applied`, `user_completion_applied`) ;
- prime **absolue** sur `score_final` (échelle 100), **sans** modifier `score_base` ni passer par la pondération modèle ;
- plafond = `score_final` théorique avec `SYSTEM_CARD_SCORE_BASE_CAP` (90).

Exemple tests : doc technique, question encore négative → +1,5 (MaydAI seul) ou +3 (deux flags).

### PDF

`POST /api/usecases/[id]/generate-pdf` charge les piliers via `getSystemCardPillarsByModel`. `attachSystemCardSectionsToCanonicalItems` colle la fiche sous l’action **seulement** si `maydai_prefill_applied`. Notes entreprise : `form_data.system_card_notes`.

## 5. Variables

| Variable | Usage |
|----------|--------|
| `GOOGLE_SHEETS_CONTROL_TOWER_ID` | **Requis** pour la sync (append + `Statut LLM`) **et** pour l’import (lecture + write-back). Absent à la sync → 500 dès le départ. |
| `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` | Dossier de l’export CSV (sinon `CONTROL_TOWER_FOLDER_ID`). |
| `GOOGLE_DRIVE_*` | Service Account Shared Drive (même stack que Compar:IA / RAG). |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Client service des routes admin. |

Pas de cron secret : ces deux routes sont admin-only.

## 6. Pièges

- **Import ≠ piliers.** Le seed SQL crée les 5 piliers de Claude Sonnet 4.5. L’import Drive n’écrit que la carte + Markdown. Dossier / score / PDF lisent `llm_system_card_pillars`.
- **Pas de colonne hub.** Ne pas ajouter `system_card_id` sur `compl_ai_models`.
- **CSV Drive ≠ Sheet.** Le CSV est un snapshot. L’import lit le Sheet. Depuis `#447`, la sync **ajoute** au Sheet les ids hub absents de la colonne A — c’est bien l’entrée de l’import, pas le fichier CSV.
- **Append-only.** Un rename provider / nom dans Supabase ne met pas à jour une ligne Sheet déjà présente. Premier onglet uniquement : un onglet mal ordonné reçoit l’append.
- **Lookup Markdown par nom** ignore `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` (constante uniquement).
- **`Prêt pour import`** = exactement `oui` après normalisation. `Déjà importé` / `Non` sont ignorés.
- **Garde-fou version** : date plus ancienne ignorée ; deux `XX` du même mois → overwrite + warning (comparaison jour non fiable).
- **`card_month` JJ/MM/AAAA** : format Hermes courant ; jour `32` ou mois `13` → `null` puis fallback nom Drive.
- **Rollback 100 %** : passer un flag à `false` doit appeler `reverseTodoActionResponse`. Ne pas upsert les flags seuls.
- **CMS questionnaire admin** (`/admin/questions`, `/admin/sections`) retiré en septembre 2026 — ne pas le recréer.
