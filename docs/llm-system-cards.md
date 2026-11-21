# System Cards LLM — dossiers, score et Tour de contrôle

Fiches d’audit GPAI (5 piliers) rattachées au **slug** canonique, pas à une colonne de `compl_ai_models`. Hub : [llm-models-hub.md](./llm-models-hub.md). Règle : `.cursor/rules/llm-models-hub.mdc`.

Livré en septembre 2026 (`#430`, `#431`, `#432`). Sync Sheet : `#447`. Piliers depuis le Markdown : `#470`. Taxonomie : `#471`. Application Sheet → base : `#475`. Préservation des fiches + cron mercredi : `#476`. Vérifié contre ces chemins.

## 1. Intention

Donner à un cas d’usage dont le modèle a une fiche :

1. une analyse MaydAI préchargée par pilier (dossier) ;
2. un bonus de score 50 / 50 (préremplissage + compléments entreprise) ;
3. une section PDF une fois le préremplissage validé ;
4. un aller-retour Drive (Tour de contrôle Hermes) pour importer le Markdown source, **découper les piliers**, et classer les lignes (taxonomie / veille).

Ce n’est **pas** une source du pivot `llm_model_source_ids`. `model_identifier` = `compl_ai_models.slug`. `compl_ai_models.system_card_status` est un **miroir** du Sheet (`generated` / `missing` / `error_no_system_card`), pas un identifiant de source.

## 2. Tables

| Table / colonne | Rôle |
|-----------------|------|
| `llm_system_cards` | Une fiche par `model_identifier` (unique). Seed : `claude-sonnet-4-5`. |
| `llm_system_card_pillars` | 5 piliers / fiche, unique `(system_card_id, pillar_code)`. Écrits par l’import **et** par « Régénérer les piliers ». |
| `compl_ai_models.system_card_status` | Miroir Sheet (`generated` \| `missing` \| `error_no_system_card`). |
| `compl_ai_models.role` / `reference_model_id` / `merged_into_id` / `base_model_id` | Taxonomie (bouton Apply). |
| `compl_ai_models.lifecycle_*` | Veille (dates, `replacement_model_id`, `lifecycle_source_url`). |
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

L’upsert (`importSystemCardsFromControlTower`) écrit `source_markdown`, `source_file_name`, `card_version_date`, `card_version_date_is_approx`, `card_date_label`, `card_month`, puis upsert les 5 lignes de `llm_system_card_pillars`.

Migrations **visibles dans le dépôt** : `source_markdown` (`20260909160000_…`) et `card_version_date_is_approx` (`20260910120000_…`). Les autres colonnes n’ont pas de `ALTER` listé — vérifier le schéma live avant un apply from scratch.

## 3. Ops admin et cron du mercredi

Boutons sur `/admin/bench-llms`. Auth admin : `verifyAdminAuth` (Bearer admin). Le cron `GET /api/cron/sync-llm-control` est dans `vercel.json` à `0 6 * * 3` (07:00 Paris en hiver), avec `Authorization: Bearer $CRON_SECRET`.

| Action | Route | Durée | Effet |
|--------|-------|-------|--------|
| Sync LLM Control | `POST /api/admin/llm-control-tower-sync` | 60 s | Append les modèles absents, rafraîchit l’identification, ne remplit « Statut Fiche Technique » que si la cellule est **vide**, réécrit les formules d’action humaine, propage `error_no_system_card` en base, exporte le CSV. N’écrit pas le bloc Suivi du LLM. `{ dryRun: true }` simule (défaut **écriture** si body absent). |
| Cron tour de contrôle | `GET /api/cron/sync-llm-control` | 60 s | Même enchaînement réel que le bouton, CSV compris. Refuse avant toute écriture si `CRON_SECRET` ou Sheet id manque. |
| Appliquer veille + taxonomie | `POST /api/admin/llm-control-tower-apply` | 60 s | Lit le Sheet, planifie les patches. **`dryRun` défaut `true`** (body absent ou invalide = simulation). `{ dryRun: false }` écrit `compl_ai_models` + `Taxonomie validée = Appliquée le YYYY-MM-DD` (date Paris). |
| Import System Cards | `POST /api/admin/llm-system-cards-import` | 300 s | Lit le **Google Sheet**, importe `Prêt pour import = Oui`, upsert la carte **et** les piliers. Succès → `Générée`. Échec parse piliers → carte déjà upsert, Sheet `Échec : piliers non générés`. |
| Régénérer les piliers | `POST /api/admin/llm-system-cards-pillars` | 60 s | Parse `source_markdown` de toutes les fiches. Défaut **simulation** (`write` absent). `{ write: true }` upsert. `claude-sonnet-4-5` est **conservé** sauf `{ replaceSeededCard: true }`. |

UI : le bouton Sync / Apply lance d’abord une **simulation** ; un second bouton « Confirmer … réelle » envoie `dryRun: false`. Exception : Import System Cards part tout de suite en écriture.

### Sync LLM Control (Sheet puis CSV)

`POST /api/admin/llm-control-tower-sync` (`lib/bench-llm/control-tower-csv.ts`). `GOOGLE_SHEETS_CONTROL_TOWER_ID` est **obligatoire** (sinon 500 `GOOGLE_SHEETS_CONTROL_TOWER_ID is not defined`).

Ordre après `verifyAdminAuth` :

1. `ensureControlTowerSyncHeaders` — refuse si les en-têtes canoniques manquent (lookup par **nom**, pas par lettre de colonne).
2. `appendMissingModelsToSheet` — ajoute les modèles absents. Une ligne nouvelle a « Statut Fiche Technique » à `Manquante` ou `Générée` si `llm_system_cards` contient le slug, et un « Statut LLM » vide.
3. `syncControlTowerDerivedColumns` — réécrit le bloc Identification et les formules « Action humaine requise ». « Statut Fiche Technique » n’est écrit que dans une cellule vide (`sheetFicheWrite`). Le bloc Suivi du LLM n’est pas écrit.
4. `syncControlTowerSystemCardStatuses` — recopie vers `compl_ai_models.system_card_status` les lignes Sheet `Erreur : Pas de System Card publiée`.
5. `exportControlTowerCsv` — upsert `MaydAI_LLM_Control_Tower.csv` via `upsertTextFileInFolder`. Dossier : `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` ou constante `CONTROL_TOWER_FOLDER_ID`.

200 : `{ success, message, fileId, rowCount, updated, modelsAppended, errorStatusesSynced }`. Append + write-back Sheet peuvent réussir **avant** un échec Drive (500 partiel).

`{ dryRun: true }` : `previewControlTowerSync` (aucune écriture) → `{ changedCells, formulasRewritten, rowsAdded }`.

Nouvelle ligne (`buildControlTowerSheetRow`) : `Statut Supabase = Importé` ; fiche `Générée` / `Manquante` ; action Hermes `NONE` / `CREATE` ; prêt `Déjà importé` / `Non` ; lien Markdown vide ; dossier Drive = constante `CONTROL_TOWER_DRIVE_FOLDER_URL`.

Hub data : page `compl_ai_models` (1000 / page) + `hasSystemCard` si `llm_system_cards.model_identifier === slug`.

`Statut LLM` (`resolveControlTowerLlmStatus`) : snapshot `provider-lifecycle.ts` (slug, nom, ids pivot) **surchargé** par `compl_ai_models.lifecycle_status` si renseigné. Hub : [llm-models-hub.md](./llm-models-hub.md) §6.

Couverture bench : 6ᵉ source (`system_card`). Filtre « En activité » = `active` **ou** `deprecated` (`isInServiceLifecycleStatus`). EcoLogits `is_active` n’entre pas dans ce filtre.

### Actions humaines (A1–A8)

Colonne « Action humaine requise », formule `MATCH` sur la ligne d’en-tête (`humanActionFormula`) — **aucune lettre de colonne** en dur. Réécrite à chaque sync. N’émet un libellé que si `Statut MaydAI = Questionnaire`.

| Code | Libellé | Condition |
|------|---------|-----------|
| A1 | Valider la taxonomie | Type de ligne non vide, Taxonomie validée vide, Hermes ≠ `CLASSER` |
| A2 | Valider la fiche | Fiche `Générée` et Validation juridique vide ou `À valider` |
| A3 | Requalifier la validation juridique | Valeur hors liste (`À valider`, `Validée r1`…`r4`, `À reprendre`) — « V2 » n’est **pas** dans la liste |
| A4 | Marquer prêt pour import | Validation juridique `Validée*` et Prêt = `Non` (`Déjà importé` éteint) |
| A5 | Traiter l’échec d’import | Résultat commence par `Erreur` / `Échec`, **sauf** `Erreur : Pas de System Card publiée` (c’est A6) |
| A6 | Décider de la suite de l’audit | Fiche commence par `Erreur :` |
| A7 | Suivre la migration des cas d’usage | Statut LLM `Déprécié` / `Retiré` et cas d’usage > 0 |
| A8 | Appliquer la taxonomie en base | Taxonomie validée = `Oui` (pas encore `Appliquée le …`) |

Install one-shot des onglets / protections : `pnpm dlx tsx scripts/control-tower-human-actions.ts --write` (sans `--write` : no-op). Pré-classement **lecture seule** : `pnpm dlx tsx scripts/control-tower-preclassify.ts`.

### Appliquer la veille et la taxonomie

`POST /api/admin/llm-control-tower-apply` (`planControlTowerApply`) :

| Déclencheur Sheet | Patch `compl_ai_models` |
|-------------------|-------------------------|
| `Source du statut` non vide | Veille : `lifecycle_status`, dates, `replacement_model_id`, `lifecycle_source_url`, `lifecycle_checked_at` |
| `Taxonomie validée` = `Oui` | Taxonomie : `role`, `reference_model_id`, `merged_into_id`, `base_model_id` |

Rôles (`CONTROL_TOWER_ROLES`) via **Type de ligne** + **Précision** (`roleFromLineLabels`) :

| Type | Précision | `role` |
|------|-----------|--------|
| Modèle | (vide) / Fiche de base | `base` |
| Modèle | Fiche de version | `version` |
| Modèle | Fiche de constat | `non_documente` |
| Variante | Stade / Réglage / Format (ou Instantané) | `stade` / `reglage` / `format` |
| Doublon | (vide) | `alias` |
| Hors champ | Auxiliaire / Introuvable | `auxiliaire` / `introuvable` |

Refus (ligne ignorée, listée dans `rejectedValues`) : ID inconnu, statut LLM hors liste, date invalide, précision incompatible, fusion circulaire, référence qui n’est pas un Modèle, tailles de paramètres différentes, chaîne / boucle de références.

Fusion (`merged_into_id`) : `reassignMergedModel` déplace les liens (pivot, évaluations, EcoLogits) vers l’absorbeur, puis recopie les cellules Drive de la ligne absorbée.

Write-back Sheet : `Taxonomie validée` → `Appliquée le YYYY-MM-DD` (fuseau `Europe/Paris`). Une valeur déjà `Appliquée le …` n’est plus `Oui` : A8 s’éteint.

### Import Markdown (Sheet → Supabase)

`importSystemCardsFromControlTower` (`lib/bench-llm/system-cards-import.ts`) :

1. Télécharge `GOOGLE_SHEETS_CONTROL_TOWER_ID` (export CSV si Spreadsheet, sinon `files.get`).
2. Propage d’abord les statuts `error_no_system_card` (`syncControlTowerSystemCardStatuses`).
3. Garde uniquement `Prêt pour import` égal à `oui` (insensible à la casse, après trim).
4. Résout le Markdown : URL / id Drive (`files.get`) **ou** nom de fichier dans le dossier **hardcodé** `CONTROL_TOWER_FOLDER_ID` (l’env d’export n’est **pas** utilisé ici).
5. Date de version : motif `YYYY-MM-DD` dans le **nom Drive**. Jour `XX` / `xx` / `??` → jour `01` + `card_version_date_is_approx = true`.
6. Label `Date de la fiche : …` lu dans le Markdown → `card_date_label`. `card_month` = 1er du mois (`normalizeCardMonth` / `resolveCardMonth`). **Ne pilote pas** le skip de version.
7. Slug : `compl_ai_models.id` si UUID, sinon nom Hermes, sinon nom modèle (`normalizeLlmModelSlug`).
8. Skip si une fiche existe déjà avec `card_version_date` **strictement plus récente**, sauf deux dates approximatives du **même mois** (upsert + warning).
9. Upsert `llm_system_cards`, pose `system_card_status = generated`, **puis** `persistParsedPillars` (`upsert` `(system_card_id, pillar_code)`).
10. Parse KO → la carte reste en base ; Sheet `Résultat de l'import` / statut = `Échec : piliers non générés` (`PILLAR_PARSE_FAILURE`). Parse OK avec libellés inconnus → `Importé le YYYY-MM-DD (N statut(s) non reconnu(s))`.
11. Réécrit le Sheet : `Résultat de l'import`, et si succès `Prêt pour import = Déjà importé`, `Action requise par Hermes = NONE`, `Statut Fiche Technique = Générée`.

HTTP import : `200` si `errors` vide ; `207` si insert + erreurs ; `500` si erreurs et `inserted === 0`. Le write-back Sheet en échec est logué, pas fatal.

Deux artefacts Drive distincts : le **CSV snapshot** (export, pas lu par l’import) et le **Sheet** (import + statuts + append sync). La sync **écrit** les nouvelles lignes hub sur le Sheet que l’import lit. Ne pas confondre le fichier CSV Drive avec le Spreadsheet.

### Parser de piliers (`parseSystemCardPillars`)

Exactement **cinq** parties distinctes, sinon échec. Règles, dans l’ordre :

| `rule` | Détection |
|--------|-----------|
| `partie` | Titres `Partie 1` … `Partie 5` |
| `partie_without_1` | `Partie 2`–`5` seulement, et le texte **avant** Partie 2 a les 4 sous-sections du gabarit (résumé / points / conformité / reco) → ce bloc = `doc_technique` |
| `english` | Headings `Technical documentation`, `Data governance & bias`, `Prompts & safeguards`, `RSP & risk assessment`, `Monitoring & oversight` |

Titres / `sections_covered` viennent du catalogue seed (`SEEDED_PILLAR_CATALOG`), pas du heading Markdown. Statuts de table non reconnus → `UNMAPPED` (l’import réussit, avec warning).

« Régénérer les piliers » relit `source_markdown` déjà en base (pas Drive). Case à cocher UI **Écrire** → `{ write: true }` ; **Remplacer claude-sonnet-4-5** → `{ replaceSeededCard: true }`. Sans écriture : rapport `{ parsed, failed, byRule, unmapped, seedComparison }`.

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

UI : `SystemCardPillarTab` sur `/dashboard/[id]/dossiers/[usecaseId]`. Sans pilier en base, l’onglet System Card n’a rien à afficher (échec parse ≠ piliers).

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
| `GOOGLE_SHEETS_CONTROL_TOWER_ID` | **Requis** pour la sync, l’apply, l’import et le cron. Absent à la sync → 500 dès le départ. |
| `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` | Dossier de l’export CSV (sinon `CONTROL_TOWER_FOLDER_ID`). |
| `GOOGLE_DRIVE_*` | Service Account Shared Drive (même stack que Compar:IA / RAG). |
| `CRON_SECRET` | Cron mercredi uniquement (`GET /api/cron/sync-llm-control`). |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Client service des routes admin. |

Les routes admin (sync, apply, import, piliers) n’utilisent **pas** `CRON_SECRET` : `verifyAdminAuth` seulement.

## 6. Pièges

- **Import écrit les piliers** depuis `#470`. Un Markdown hors gabarit upsert quand même la carte, puis pose `Échec : piliers non générés`. Relancer « Régénérer les piliers » après correction du Markdown en base, ou réimporter.
- **Seed Claude.** `write: true` sans `replaceSeededCard` ne touche pas `claude-sonnet-4-5`.
- **Pas de colonne hub de source.** `system_card_status` / `role` sont des métadonnées de fiche, pas un `llm_stats_id`. Ne pas ajouter `system_card_id` sur `compl_ai_models`.
- **CSV Drive ≠ Sheet.** Le CSV est un snapshot. L’import lit le Sheet. La sync **ajoute** au Sheet les ids hub absents de la colonne A.
- **Append-only + cellules fiche.** Un rename provider / nom dans Supabase ne met pas à jour une ligne déjà présente. Une cellule « Statut Fiche Technique » déjà remplie (y compris `Erreur : …` ou `En cours`) n’est **pas** écrasée par la sync.
- **dryRun inversé.** Sync : défaut = écriture. Apply / piliers : défaut = simulation.
- **Lookup Markdown par nom** ignore `GOOGLE_DRIVE_FOLDER_CONTROL_TOWER` (constante uniquement).
- **`Prêt pour import`** = exactement `oui` après normalisation. `Déjà importé` / `Non` sont ignorés.
- **Garde-fou version** : date plus ancienne ignorée ; deux `XX` du même mois → overwrite + warning (comparaison jour non fiable).
- **`card_month` JJ/MM/AAAA** : format Hermes courant ; jour `32` ou mois `13` → `null` puis fallback nom Drive.
- **Actions humaines** : uniquement `Statut MaydAI = Questionnaire`. Une ligne Catalogue n’affiche rien même si A2/A8 seraient vrais.
- **A8 ≠ Apply automatique.** `Oui` allume l’action ; seul le bouton Apply (confirmé) écrit la base.
- **Rollback 100 %** : passer un flag à `false` doit appeler `reverseTodoActionResponse`. Ne pas upsert les flags seuls.
- **CMS questionnaire admin** (`/admin/questions`, `/admin/sections`) retiré en septembre 2026 — ne pas le recréer.
