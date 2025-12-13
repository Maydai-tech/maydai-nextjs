# Guide de Migration - Ajout de sub_category_id

## Problème
L'erreur "Erreur lors de la création du profil" survient car la colonne `sub_category_id` n'existe pas encore dans la table `profiles` de Supabase.

## Solution
Exécuter la migration SQL pour ajouter la colonne `sub_category_id` à la table `profiles`.

---

## Étapes à suivre

### Étape 1 : Vérifier l'état actuel

1. Ouvrir **Supabase Dashboard**
2. Aller dans **SQL Editor**
3. Copier et exécuter le script : `supabase/migrations/scripts/verify_sub_category_id.sql`

**Résultat attendu** :
- Si **aucun résultat** : la colonne n'existe pas → procéder à l'étape 2
- Si **résultat affiché** : la colonne existe déjà → le problème est ailleurs

### Étape 2 : Exécuter la migration

1. Dans **Supabase Dashboard > SQL Editor**
2. Copier le contenu du fichier : `supabase/migrations/scripts/apply_sub_category_id_migration.sql`
3. Coller dans l'éditeur SQL
4. Cliquer sur **"Run"** pour exécuter
5. Vérifier qu'il n'y a **pas d'erreur** dans les résultats

### Étape 3 : Vérifier le succès de la migration

1. Dans **Supabase Dashboard > SQL Editor**
2. Copier et exécuter le script : `supabase/migrations/scripts/verify_migration_success.sql`
3. Vérifier que :
   - La colonne `sub_category_id` apparaît dans les résultats
   - Le type est `text`
   - `is_nullable` est `YES`

### Étape 4 : Tester dans l'application

1. Redémarrer l'application si nécessaire
2. Tenter de compléter le profil avec :
   - **Secteur principal** : "Tech, Data & Télécoms"
   - **Sous-catégorie** : "Logiciels, SaaS & Plateformes"
3. Vérifier que l'erreur ne se produit plus
4. Vérifier dans Supabase que les données sont enregistrées :

```sql
SELECT id, first_name, last_name, company_name, industry, sub_category_id
FROM profiles
ORDER BY updated_at DESC
LIMIT 5;
```

---

## Scripts SQL disponibles

Tous les scripts sont dans le dossier `supabase/migrations/scripts/` :

1. **verify_sub_category_id.sql** - Vérifier si la colonne existe
2. **apply_sub_category_id_migration.sql** - Exécuter la migration
3. **verify_migration_success.sql** - Vérifier le succès de la migration
4. **rollback_sub_category_id.sql** - Rollback en cas de problème

---

## Détails techniques

- **Colonne** : `sub_category_id`
- **Type** : `TEXT`
- **Nullable** : `YES` (pour compatibilité avec les profils existants)
- **Table** : `profiles`
- **Migration idempotente** : peut être exécutée plusieurs fois sans erreur (utilise `IF NOT EXISTS`)

---

## En cas de problème

### Si l'erreur persiste après la migration

1. **Vérifier les permissions RLS** :
   - Supabase Dashboard > Authentication > Policies
   - S'assurer que les politiques permettent l'insertion/update de `sub_category_id`

2. **Vérifier les logs** :
   - Console du navigateur (F12 > Network)
   - Logs serveur pour des erreurs SQL spécifiques

3. **Vérifier le type de données** :
   - S'assurer que `sub_category_id` est bien de type TEXT

### Rollback (si nécessaire)

Si la migration cause des problèmes, exécuter :
`supabase/migrations/scripts/rollback_sub_category_id.sql`

**ATTENTION** : Cette opération supprimera toutes les données dans la colonne `sub_category_id`.

---

## Notes importantes

- Les profils existants auront `sub_category_id = NULL` jusqu'à ce qu'ils soient mis à jour
- La migration est compatible avec les données existantes (colonne nullable)
- La migration utilise `IF NOT EXISTS` donc elle est sûre à exécuter plusieurs fois

