# Analytics — parcours court V3 (GTM / `dataLayer`)

Instrumentation **côté client uniquement** via `sendGTMEvent` (`lib/gtm.ts`). Aucun appel serveur dédié, aucune donnée de réponses questionnaire ni texte libre.

**Panneau produit / ops (cartographie + recettes GA4, sans chiffres live)** : `/admin/analytics/v3-short-path` — code `app/admin/analytics/v3-short-path/`, définitions `lib/v3-short-path-pilotage.ts`.

## Événements

| Événement | Quand | Champs utiles |
|-----------|--------|-----------------|
| `v3_short_path_start` | Chargement de la page d’évaluation avec `?parcours=court` et cas V3 prêt | Idem + `entry_surface` si l’URL contient `entree=` (surface d’origine) |
| `v3_evaluation_entry_surface` | Chargement de la page d’évaluation en **parcours long** avec paramètre `entree=` | `questionnaire_version`, `usecase_id`, `path_mode` (`long`), `entry_surface`, `system_type_bucket` |
| `v3_short_path_segment` | Première entrée dans chaque segment 1–5 **par session de page** (pas de re-feu si l’utilisateur revient en arrière sur un segment déjà vu) | `segment_order`, `segment_key`, `question_id` (code question courante) |
| `v3_short_path_outcome_view` | **Legacy** — ancien écran de sortie courte (supprimé) ; l’API `trackV3ShortPathOutcomeView` existe encore mais n’est plus appelée depuis l’UI | `usecase_id` |
| `v3_short_path_outcome_result` | Réponse API `/api/use-cases/[id]/risk-level` OK avec statut de classification | `classification_status`, `risk_level`, `system_type_bucket` |
| `v3_short_path_cta` | Clic sur un CTA ou action d’export listée ci-dessous | `cta`, `classification_status` / `risk_level` si déjà connus côté client ; `cta_placement` (optionnel) pour distinguer la zone d’écran |

### Valeurs `cta` (`v3_short_path_cta`)

- `evaluation_long` — lien vers le parcours complet (libellé variable selon l’écran)
- `evaluation_short` — lien vers le parcours court (`?parcours=court`)
- `overview` — synthèse du cas
- `dossier` — dossier du cas
- `todo` — todo conformité
- `dashboard` — tableau de bord entreprise
- `copy_summary` — copie réussie du résumé
- `download_txt` — téléchargement `.txt`
- `download_md` — téléchargement `.md`
- `download_pdf_prediagnostic` — **Legacy** — route PDF pré-diagnostic supprimée ; ne plus s’attendre à de nouveaux hits
- `mailto_prepare` — clic sur « Préparer un e-mail »

### Valeurs `cta_placement` (optionnel, `v3_short_path_cta`)

- `outcome_hero` — **Legacy** — ancien bloc « prochain pas » sur l’écran de sortie courte (supprimé)
- `outcome_quick_links` — grille « Accès rapides » sur la sortie courte
- `intro_primary` — CTA parcours complet en tête du parcours court (`V3ShortPathIntro`)
- `overview_v3_card` — encart synthèse cas V3 non terminé (`page.tsx` overview)
- `header_v3_resume` — bouton « Continuer le questionnaire » sur la fiche cas (`UseCaseHeader`, V3 brouillon)
- `outcome_error_fallback` — liens de secours quand l’API niveau / qualification a échoué sur la sortie courte

### Paramètre d’URL `entree` (orientation amont)

Les liens vers `/usecases/[id]/evaluation` peuvent inclure `?entree=` ou `&entree=` (voir `withEvaluationEntree` dans `app/usecases/[id]/utils/routes.ts`). Valeurs usuelles :

| `entry_surface` / `entree` | Contexte |
|----------------------------|-----------|
| `dashboard_card` | Clic sur une carte cas V3 « à compléter » depuis le dashboard → synthèse |
| `dashboard_card_legacy` | Cas non-V3 à compléter depuis le dashboard → évaluation longue directe |
| `overview_v3_card_long` / `overview_v3_card_short` | CTA depuis l’encart synthèse V3 |
| `header_v3_resume` / `header_v3_short` | Fiche cas (`UseCaseHeader`) |
| `dossier_detail_long` / `dossier_detail_short` | Encart orientation dossier |
| `short_path_intro_long` | CTA long depuis l’intro du parcours court |
| `short_path_outcome_long` | CTA long depuis la sortie courte |
| `outcome_error_fallback_long` | CTA long depuis la sortie courte en cas d’erreur API |

## Pilotage produit (exemples GTM / GA4)

- **Entrées court** : compter `v3_short_path_start` ; croiser avec `entry_surface` si présent
- **Entrées long** avec traçage amont : `v3_evaluation_entry_surface` filtré par `entry_surface`
- **Entonnoir segments** : `v3_short_path_segment` par `segment_key` / `segment_order`
- **Taux d’arrivée au résultat** : `outcome_view` / `start`
- **Répartition qualification** : `outcome_result` par `risk_level` + `classification_status`
- **Conversion vers le long** : `cta` = `evaluation_long` / `outcome_view` ; filtrer par `cta_placement` (`outcome_hero`, `overview_v3_card`, `header_v3_resume`, `intro_primary`) pour le tunnel court → long
- **Partage** : `copy_summary`, `download_txt`, `download_md`, `mailto_prepare`

## Fichiers source

- `lib/v3-short-path-analytics.ts` — fonctions `trackV3ShortPath*`
- `app/usecases/[id]/evaluation/EvaluationPageContent.tsx` — `v3_short_path_start` + `v3_evaluation_entry_surface`
- `app/usecases/[id]/components/evaluation/StepByStepQuestionnaire.tsx` — `v3_short_path_segment`
