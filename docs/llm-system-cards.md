# System Cards LLM — dossiers, score et Tour de contrôle

Fiches d’audit GPAI (5 piliers) rattachées au **slug** canonique, pas à une colonne de `compl_ai_models`. Hub : [llm-models-hub.md](./llm-models-hub.md). Règle : `.cursor/rules/llm-models-hub.mdc`.

Livré en septembre 2026 (`#430`, `#431`, `#432`). Vérifié contre le code de ces chemins.

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
| Sync LLM Control | `POST /api/admin/llm-control-tower-sync` | 60 s | Exporte un CSV snapshot vers Drive |
| Import System Cards | `POST /api/admin/llm-system-cards-import` | 300 s | Lit le **Google Sheet**, importe les lignes `Prêt pour import = Oui` |

### Export CSV (MaydAI → Drive)

`exportControlTowerCsv` (`lib/bench-llm/control-tower-csv.ts`) :

1. Page `compl_ai_models` (1000 / page).
2. Marque `hasSystemCard` si `llm_system_cards.model_identifier === slug`.
3. Écrit `MaydAI_LLM_Control_Tower.csv` via `upsertTextFileInFolder`.
4. Dossier : `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` ou constante `CONTROL_TOWER_FOLDER_ID`.

Colonnes : ID Supabase, provider, nom, nom Hermes (`slug` avec `_`), statuts, lien dossier, date MAJ, action Hermes (`CREATE` / `NONE`), prêt (`Non` / `Déjà importé`). La colonne Markdown est laissée vide — Hermes la remplit.

### Import Markdown (Sheet → Supabase)

`importSystemCardsFromControlTower` (`lib/bench-llm/system-cards-import.ts`) :

1. Télécharge `GOOGLE_SHEETS_CONTROL_TOWER_ID` (export CSV si Spreadsheet, sinon `files.get`).
2. Garde uniquement `Prêt pour import` égal à `oui` (insensible à la casse, après trim).
3. Résout le Markdown : URL / id Drive (`files.get`) **ou** nom de fichier dans le dossier **hardcodé** `CONTROL_TOWER_FOLDER_ID` (l’env d’export n’est **pas** utilisé ici).
4. Date de version : motif `YYYY-MM-DD` dans le **nom Drive**. Jour `XX` / `xx` / `??` → jour `01` + `card_version_date_is_approx = true`.
5. Label `Date de la fiche : …` lu dans le Markdown (`card_date_label` / `card_month`) — **ne pilote pas** le skip de version.
6. Slug : `compl_ai_models.id` si UUID, sinon nom Hermes, sinon nom modèle (`normalizeLlmModelSlug`).
7. Skip si une fiche existe déjà avec `card_version_date` **strictement plus récente**, sauf deux dates approximatives du **même mois** (upsert + warning).
8. Upsert **uniquement** `llm_system_cards`. **Aucun** insert dans `llm_system_card_pillars`.
9. Réécrit le Sheet : `Statut Supabase`, et si succès `Prêt pour import = Déjà importé`, `Action requise par Hermes = NONE`.

HTTP import : `200` si `errors` vide ; `207` si insert + erreurs ; `500` si erreurs et `inserted === 0`. Le write-back Sheet en échec est logué, pas fatal.

Deux artefacts Drive distincts : le **CSV snapshot** (export) et le **Sheet** (import + statuts). Ne pas les confondre.

## 4. Produit (dossiers, score, PDF)

Identifiant modèle côté UI / PDF : `compl_ai_models.slug`, sinon `usecases.llm_model_version`.

```
GET  /api/system-cards/{modelIdentifier}/pillars/{pillarCode}   Bearer user
POST /api/dossiers/pillar-completion                            Bearer + user_companies
```

`GET` : 401 sans Bearer ; 400 si code inconnu ; `{ pillar: null }` si pas de ligne.

`POST` body (Zod) : `usecaseId`, `pillarCode`, au moins un des flags `applyMaydaiPrefill` / `applyUserCompletion` ; `dossierId` optionnel (créé si absent) ; `userNotes` (max 20 000) persisté dans `form_data.system_card_notes` seulement si `applyUserCompletion`.

`updateDossierPillarCompletion` :

- upsert `dossier_documents` sur `(dossier_id, doc_type)` ;
- si `complete` → `syncTodoActionToResponse(…, 'system-card')` (échec sync logué, pas bloquant) ;
- recalcule le score (`calculateAndPersistUseCaseScore`).

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
| `GOOGLE_SHEETS_CONTROL_TOWER_ID` | **Requis** pour l’import (lecture + write-back). Absent → throw à l’export Sheet / no-op write-back si manquant au write. |
| `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` | Dossier de l’export CSV (sinon `CONTROL_TOWER_FOLDER_ID`). |
| `GOOGLE_DRIVE_*` | Service Account Shared Drive (même stack que Compar:IA / RAG). |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Client service des routes admin. |

Pas de cron secret : ces deux routes sont admin-only.

## 6. Pièges

- **Import ≠ piliers.** Le seed SQL crée les 5 piliers de Claude Sonnet 4.5. L’import Drive n’écrit que la carte + Markdown. Dossier / score / PDF lisent `llm_system_card_pillars`.
- **Pas de colonne hub.** Ne pas ajouter `system_card_id` sur `compl_ai_models`.
- **CSV ≠ Sheet.** Sync Control Tower n’alimente pas l’import.
- **Lookup Markdown par nom** ignore `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` (constante uniquement).
- **`Prêt pour import`** = exactement `oui` après normalisation. `Déjà importé` / `Non` sont ignorés.
- **Garde-fou version** : date plus ancienne ignorée ; deux `XX` du même mois → overwrite + warning (comparaison jour non fiable).
- **CMS questionnaire admin** (`/admin/questions`, `/admin/sections`) retiré en septembre 2026 — ne pas le recréer.
