# Implémentation des Modèles Perplexity et Scores Rang Compar:IA

> **Note historique.** Ce document décrit un ancien chemin admin. Ne plus ajouter de colonnes dénormalisées sur `compl_ai_models` pour une source externe : mapping via `llm_model_source_ids` uniquement (`.cursor/rules/llm-models-hub.mdc`).

## Résumé
Ce document décrit l'implémentation complète de l'ajout des 4 modèles Perplexity avec leurs métadonnées et le nouveau système de scoring "Rang Compar:IA".

## Modifications de la Base de Données

### 1. Migration 003 - Ajout de Champs aux Modèles et Évaluations
**Fichier**: `supabase/migrations/003_add_model_metadata_and_scores.sql`

#### Nouveaux champs pour `compl_ai_models`:
- `short_name` (TEXT) - Nom court du modèle (ex: "Sonar")
- `long_name` (TEXT) - Nom long du modèle (ex: "Sonar (Standard)")
- `launch_date` (DATE) - Date de lancement officielle
- `model_provider_id` (INTEGER) - Référence au fournisseur dans `model_providers`

#### Nouveau champ pour `compl_ai_evaluations`:
- `rang_compar_ia` (NUMERIC) - Score alternatif sur échelle 0-20
- Contrainte: valeur entre 0 et 20 si fournie

### 2. Migration 004 - Insertion des Modèles Perplexity
**Fichier**: `supabase/migrations/004_insert_perplexity_models.sql`

#### Modèles insérés:
1. **Sonar (Standard)** - Lancé le 21/01/2025
   - Modèle rapide et économique pour recherche en temps réel
   
2. **Sonar Pro** - Lancé le 21/01/2025
   - Recherche approfondie pour requêtes complexes
   
3. **Sonar Reasoning** - Lancé le 29/01/2025
   - Modèle de raisonnement avec chaînes de pensée
   
4. **Sonar Deep Research** - Lancé le 14/02/2025
   - Génération de rapports longs avec recherches parallèles

#### Évaluations créées:
- 20 évaluations au total (4 modèles × 5 principes AI Act)
- Principes couverts:
  - `technical_robustness_safety`
  - `privacy_data_governance`
  - `transparency`
  - `diversity_non_discrimination_fairness`
  - `social_environmental_wellbeing`
- Scores `rang_compar_ia` initialisés à NULL (saisie manuelle)

## Modifications du Code TypeScript

### 1. Interfaces Mises à Jour
**Fichier**: `lib/supabase.ts`

```typescript
export interface ComplAIModel {
  // ... champs existants
  short_name?: string
  long_name?: string
  launch_date?: string
  model_provider_id?: number
}

export interface ComplAIEvaluation {
  // ... champs existants
  rang_compar_ia?: number
  maydai_score?: number // Ajouté également
}
```

### 2. API d'Administration

#### API de Création de Modèles - Mise à Jour
**Fichier**: `app/api/admin/compl-ai/models/route.ts`
- Accepte maintenant les champs `short_name`, `long_name`, `launch_date`, `model_provider_id`
- Validation maintenue sur `model_name` et `model_provider`

#### Nouvelle API d'Édition d'Évaluation
**Fichier**: `app/api/admin/compl-ai/evaluations/[id]/route.ts`

##### Endpoints:
- **PATCH** `/api/admin/compl-ai/evaluations/[id]`
  - Mise à jour d'une évaluation (rang_compar_ia, score, maydai_score, etc.)
  - Validation: score rang_compar_ia entre 0 et 20
  - Nécessite authentification admin
  
- **GET** `/api/admin/compl-ai/evaluations/[id]`
  - Récupération d'une évaluation avec ses relations
  - Retourne modèle et principe associés

### 3. Interface d'Administration

**Fichier**: `app/admin/compl-ai-scores/page.tsx`

#### Nouvelles fonctionnalités:

##### Affichage des Modèles:
- Nom court affiché dans le tableau principal
- Nom long visible au survol (title)
- Date de lancement affichée sous le nom (icône 🚀)

##### Scores Rang Compar:IA:
- Badge bleu à côté du score MaydAI
- Calcul automatique de la moyenne par principe
- Édition inline avec bouton cliquable
- Validation: 0-20 avec décimales
- Sauvegarde via nouvelle API

##### Formulaire de Modèle:
- Nouveaux champs: Nom court, Nom long, Date de lancement
- Pré-rempli lors de l'édition d'un modèle existant
- Validation maintenue sur champs obligatoires

#### Fonctions ajoutées:
- `handleSaveRangComparIa()` - Sauvegarde du score Rang Compar:IA
- État `editingRangComparIa` pour gestion de l'édition

## Utilisation

### 1. Exécution des Migrations

```bash
# Se connecter à Supabase et exécuter les migrations dans l'ordre
psql $DATABASE_URL < supabase/migrations/003_add_model_metadata_and_scores.sql
psql $DATABASE_URL < supabase/migrations/004_insert_perplexity_models.sql
```

### 2. Accès à l'Interface Admin

1. Naviguer vers `/admin/compl-ai-scores`
2. Les 4 modèles Perplexity apparaissent dans le tableau
3. Pour chaque principe, cliquer sur le badge "Compar:IA: --"
4. Saisir un score entre 0 et 20
5. Cliquer sur l'icône ✓ pour sauvegarder

### 3. Édition d'un Modèle

1. Cliquer sur l'icône crayon à côté du nom du modèle
2. Modifier les champs souhaités (nom court, nom long, date)
3. Cliquer sur "Modifier" pour sauvegarder

### 4. Filtrage par Date (à implémenter)

La structure est en place pour ajouter un filtre par `launch_date`:
- Index créé sur `compl_ai_models.launch_date`
- Données disponibles dans le state

## Prochaines Étapes Suggérées

1. **Ajouter un filtre de date** dans l'interface admin
   - Dropdown ou date picker
   - Filtrer les modèles par période de lancement

2. **Importer les scores réels** pour Perplexity
   - Remplir les valeurs `rang_compar_ia` via l'interface
   - Ou créer un script d'import CSV

3. **Afficher les scores dans les use cases**
   - Intégrer `rang_compar_ia` dans le calcul de scoring
   - Afficher dans les détails du modèle

4. **Documentation utilisateur**
   - Guide pour la saisie des scores
   - Explication de l'échelle 0-20

## Tests Recommandés

- [ ] Vérifier que les 4 modèles Perplexity sont bien visibles
- [ ] Tester l'édition d'un score rang_compar_ia
- [ ] Vérifier le calcul de la moyenne par principe
- [ ] Tester la modification d'un modèle existant
- [ ] Vérifier l'affichage des dates de lancement
- [ ] Tester avec un modèle sans scores (affichage "N/A")

## Notes Techniques

- Les scores `rang_compar_ia` sont indépendants des scores Comply AI
- Le champ `model_provider_id` est nullable pour compatibilité ascendante
- Les migrations utilisent `ON CONFLICT DO NOTHING` pour idempotence
- L'UI admin calcule dynamiquement les moyennes côté client









