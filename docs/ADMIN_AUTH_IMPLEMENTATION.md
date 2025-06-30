# Implémentation du Système d'Authentification Admin

## Vue d'ensemble

Le système d'authentification admin a été complètement refactorisé pour remplacer l'ancien système basé sur un simple header `admin-secret` par un système robuste basé sur les rôles utilisateurs dans Supabase.

## Changements effectués

### 1. Structure de la base de données

Un script SQL (`scripts/add-user-roles.sql`) a été créé pour :
- Ajouter une colonne `role` dans la table `profiles` avec les valeurs possibles : `user`, `admin`, `super_admin`
- Créer des fonctions helper PostgreSQL (`is_admin`, `is_super_admin`)
- Implémenter des politiques RLS (Row Level Security) pour les admins
- Ajouter une table `admin_logs` pour l'audit des actions admin

### 2. Middleware d'authentification (`lib/admin-auth.ts`)

Nouveau module centralisé qui fournit :
- `verifyAdminAuth()` : Fonction middleware pour vérifier l'authentification et les rôles dans les API routes
- Types TypeScript pour les rôles (`UserRole`, `AdminProfile`)
- Fonctions helper (`hasAdminRole`, `isSuperAdmin`)
- Gestion des logs d'audit automatique
- Fonctions pour promouvoir/rétrograder des admins

### 3. Mise à jour des routes API

La route `/api/admin/recalculate-scores/route.ts` a été mise à jour pour :
- Utiliser le nouveau middleware `verifyAdminAuth()`
- Valider le token JWT au lieu du header `admin-secret`
- Logger l'admin qui effectue l'action

### 4. Composant de protection côté client

`AdminProtectedRoute` a été mis à jour pour :
- Vérifier le rôle dans la table `profiles` au lieu de `users_roles`
- Support des rôles `admin` et `super_admin`
- Paramètres configurables (`requiredRole`, `fallbackUrl`)

### 5. Interface de gestion des admins

Nouvelle page `/admin/users` qui permet aux super admins de :
- Voir la liste des administrateurs
- Promouvoir/rétrograder des utilisateurs
- Gérer les rôles de manière sécurisée

## Guide de migration

### Étape 1 : Exécuter le script SQL

Dans le dashboard Supabase, aller dans SQL Editor et exécuter le contenu de `scripts/add-user-roles.sql`.

### Étape 2 : Promouvoir le premier super admin

```sql
UPDATE profiles SET role = 'super_admin' WHERE email = 'votre@email.com';
```

### Étape 3 : Mettre à jour les appels API

Remplacer les anciens headers :
```typescript
// Ancien
headers: {
  'authorization': 'Bearer admin-secret'
}

// Nouveau
headers: {
  'authorization': `Bearer ${session.access_token}`
}
```

### Étape 4 : Protéger les routes admin

```typescript
// Pour les pages
<AdminProtectedRoute requiredRole="admin">
  <VotreComposantAdmin />
</AdminProtectedRoute>

// Pour les API routes
const { user, error } = await verifyAdminAuth(request, 'admin')
if (error) return error
```

## Niveaux de sécurité

1. **user** : Utilisateur normal, accès standard
2. **admin** : Peut accéder aux fonctionnalités d'administration
3. **super_admin** : Peut gérer les autres admins et accéder à toutes les fonctionnalités

## Bonnes pratiques

1. **Toujours utiliser le middleware** dans les routes API admin
2. **Logger les actions sensibles** via le système de logs
3. **Limiter le nombre de super admins**
4. **Réviser régulièrement** la liste des admins
5. **Ne jamais exposer** les tokens d'authentification

## Debugging

Pour vérifier le rôle d'un utilisateur :
```sql
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';
```

Pour voir les logs admin :
```sql
SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 50;
```

## Prochaines étapes recommandées

1. Implémenter une expiration des sessions admin
2. Ajouter une authentification 2FA pour les admins
3. Créer des notifications pour les actions admin critiques
4. Implémenter des permissions granulaires par fonctionnalité