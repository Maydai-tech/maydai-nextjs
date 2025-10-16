# Plan d'Action - Limitation de Création de Registres par Plan

## Contexte
- Limites de registres définies dans la table `plans` de Supabase
- Restriction uniquement sur la **création** de nouveaux registres
- Les registres existants restent visibles même si l'utilisateur dépasse la limite après un downgrade

## Étapes d'Implémentation

### 1. **Vérification de la structure de données**
- Consulter la table `plans` pour confirmer la colonne des limites de registres
- Vérifier la relation entre `users` → `plans`

### 2. **Récupération des données nécessaires**
- Utiliser le hook existant `useUserPlan` de `@/app/abonnement/hooks/useUserPlan.ts` pour récupérer le plan actuel
- Ajouter dans la page :
  - Limite de registres du plan actuel (via `useUserPlan`)
  - Nombre de registres existants (déjà disponible via `registries.length`)

### 3. **Logique de vérification**
- Au clic sur "Ajouter un nouveau registre" :
  - Comparer `nombre_registres_existants` avec `limite_plan`
  - Si `nombre >= limite` : afficher popup
  - Sinon : continuer le flux normal de création

### 4. **Création de la popup**
- Composant simple avec :
  - Message : "Vous avez atteint la limite de registres de votre plan actuel"
  - Bouton "Fermer" ou "Comprendre"
  - (Optionnel futur : lien vers upgrade de plan)

### 5. **Modification du bouton d'ajout**
- Intercepter le clic avant la redirection vers `/dashboard/registries/new`
- Implémenter la vérification avant la navigation

## Fichiers à Modifier

### 1. **Fichiers à modifier**
- **`/app/dashboard/registries/page.tsx`** (lignes 183-193)
  - Importer le hook `useUserPlan` depuis `@/app/abonnement/hooks/useUserPlan.ts`
  - Récupérer les informations du plan via `useUserPlan()`
  - Récupérer le nombre de registres existants (déjà disponible via `companies.length`)
  - Modifier le `<Link>` vers `/registries/new` (ligne 184-192) pour intercepter le clic
  - Implémenter la logique de vérification avant navigation
  - Gérer l'état d'ouverture de la modal

### 2. **Fichiers à créer**
- **`/components/Registries/RegistryLimitModal.tsx`** (nouveau composant)
  - Modal simple inspirée de `ConfirmRemoveCollaboratorModal.tsx`
  - Props : `isOpen`, `onClose`, `currentCount`, `maxLimit`
  - Affichage d'un message informatif
  - Bouton "Fermer" ou "J'ai compris"
  - Style cohérent avec les autres modales existantes

## Points d'Attention
- ✅ Les registres existants au-delà de la limite restent accessibles
- ✅ Pas de suppression ou masquage de registres existants
- ✅ Vérification côté client pour UX rapide
