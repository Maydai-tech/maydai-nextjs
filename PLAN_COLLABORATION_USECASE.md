# Plan d'Action : Onglet "Collaboration" pour les Use Cases

## 📋 Vue d'ensemble

Ce document décrit le plan d'action pour ajouter un nouvel onglet "Collaboration" dans la page des use cases, permettant de visualiser et gérer les collaborateurs ayant accès à un cas d'usage spécifique.

## 🎯 Objectifs

- Ajouter un onglet "Collaboration" dans la navigation des use cases
- Afficher la liste des collaborateurs du use case avec leurs scopes d'accès (usecase, registry, account)
- Permettre l'invitation de nouveaux collaborateurs au niveau use case
- Permettre la suppression des collaborateurs ayant un accès au niveau use case uniquement

## 📁 Architecture Existante

### Routes API Existantes

Les routes API pour la gestion des collaborateurs au niveau use case existent déjà :

- **GET** `/api/usecases/[id]/collaborators` - Récupère la liste des collaborateurs
  - Retourne les collaborateurs avec leur scope (usecase, registry, account)
  - Gère la fusion et déduplication des collaborateurs de différents niveaux

- **POST** `/api/usecases/[id]/collaborators` - Invite un collaborateur
  - Vérifie que l'utilisateur est propriétaire de la company parente
  - Crée une entrée dans `user_usecases` avec le role 'user'

- **DELETE** `/api/usecases/[id]/collaborators/[collaboratorId]` - Supprime un collaborateur
  - Vérifie que l'utilisateur est propriétaire de la company parente
  - Supprime l'entrée dans `user_usecases`

### Composants Existants Réutilisables

1. **RegistryCollaboratorList.tsx** - Composant d'affichage de la liste
   - Affiche les collaborateurs avec avatars
   - Badges de scope (account, registry)
   - Gestion des propriétaires
   - Boutons de suppression conditionnels

2. **InviteCollaboratorModal.tsx** - Modal d'invitation
   - Formulaire d'invitation (email, prénom, nom)
   - Gestion des erreurs et succès
   - Paramètre `scope` configurable

3. **UseCaseNavigation.tsx** - Navigation des use cases
   - Déjà prête pour l'onglet collaboration (icône Users existante)
   - Gestion des onglets actifs

## 🔧 Modifications Nécessaires

### 1. Routes de Navigation

**Fichier** : `app/usecases/[id]/utils/routes.ts`

**Action** : Ajouter la route collaboration

```typescript
export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  evaluation: (id: string) => `/usecases/${id}/evaluation`,
  rapport: (id: string) => `/usecases/${id}/rapport`,
  collaboration: (id: string) => `/usecases/${id}/collaboration`, // NOUVEAU
  dashboard: (companyId: string) => `/dashboard/${companyId}`,
  companies: () => '/dashboard/registries'
}

export const useCaseNavigation = [
  {
    key: 'overview',
    label: 'Aperçu',
    href: (id: string) => useCaseRoutes.overview(id)
  },
  {
    key: 'rapport',
    label: 'Rapport',
    href: (id: string) => useCaseRoutes.rapport(id)
  },
  {
    key: 'collaboration', // NOUVEAU
    label: 'Collaboration',
    href: (id: string) => useCaseRoutes.collaboration(id)
  }
]
```

### 2. Créer le Composant UseCaseCollaboratorList

**Fichier** : `components/Collaboration/UseCaseCollaboratorList.tsx` (NOUVEAU)

**Action** : Adapter RegistryCollaboratorList pour les use cases

**Différences clés** :
- Badge "Use Case" au lieu de "Registre" pour scope='usecase'
- Adapter les tooltips et messages
- Couleur distinctive pour le scope 'usecase' (bleu au lieu de vert)

**Scopes à gérer** :
- `account` : Accès global (violet, non supprimable)
- `registry` : Accès au registre parent (vert, non supprimable)
- `usecase` : Accès au use case uniquement (bleu, supprimable)

### 3. Créer la Page de Collaboration

**Fichier** : `app/usecases/[id]/collaboration/page.tsx` (NOUVEAU)

**Composants à intégrer** :
1. `UseCaseLayout` - Layout commun avec navigation
2. `UseCaseCollaboratorList` - Liste des collaborateurs
3. `InviteCollaboratorModal` - Modal d'invitation

**Fonctionnalités** :
- Récupération des collaborateurs via GET `/api/usecases/[id]/collaborators`
- Bouton "Inviter un collaborateur" (visible uniquement pour les propriétaires)
- Invitation via POST `/api/usecases/[id]/collaborators`
- Suppression via DELETE `/api/usecases/[id]/collaborators/[collaboratorId]`
- Gestion des états de chargement et d'erreur

### 4. Hook Personnalisé pour la Gestion des Collaborateurs

**Fichier** : `app/usecases/[id]/hooks/useUseCaseCollaborators.ts` (NOUVEAU)

**Responsabilités** :
- Fetch des collaborateurs
- État de chargement
- Gestion des erreurs
- Fonction d'invitation
- Fonction de suppression
- Rafraîchissement automatique après modification

## 📊 Modèle de Données

### Scopes d'Accès (par ordre de priorité)

1. **Account** (priorité haute)
   - Table : `user_profiles`
   - Relations : `inviter_user_id` → owner du use case
   - Accès : Tous les registres et use cases du propriétaire
   - Supprimable depuis : Page Paramètres uniquement

2. **Registry** (priorité moyenne)
   - Table : `user_companies`
   - Relations : `company_id` → company parente du use case
   - Accès : Tous les use cases du registre
   - Supprimable depuis : Page du registre uniquement

3. **Use Case** (priorité basse)
   - Table : `user_usecases`
   - Relations : `usecase_id` → use case spécifique
   - Accès : Ce use case uniquement
   - Supprimable depuis : Page du use case

### Règles de Déduplication

Quand un utilisateur a plusieurs accès :
- L'API retourne tous les scopes mais avec priorité account > registry > usecase
- L'UI affiche le badge du scope le plus élevé
- La suppression n'est possible que si scope = 'usecase'

## 🔐 Permissions et Sécurité

### Qui peut inviter des collaborateurs ?

**Seul le propriétaire de la company parente** peut inviter des collaborateurs au niveau use case.

**Vérification** :
```typescript
// Dans l'API route
const userIsOwner = await isOwner(user.id, 'company', usecase.company_id)
if (!userIsOwner) {
  return NextResponse.json({ error: 'Only company owners can invite collaborators' }, { status: 403 })
}
```

### Qui peut supprimer des collaborateurs ?

**Seul le propriétaire de la company parente** peut supprimer des collaborateurs.

**Restrictions** :
- Seuls les collaborateurs avec `scope='usecase'` peuvent être supprimés depuis cette page
- Les collaborateurs avec `scope='account'` ou `scope='registry'` sont en lecture seule

## 🎨 Interface Utilisateur

### Structure de la Page

```
┌─────────────────────────────────────────────────────┐
│ UseCaseLayout                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Navigation: [Aperçu] [Rapport] [Collaboration]  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Header avec titre et bouton "Inviter"          │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ UseCaseCollaboratorList                         │ │
│ │ ┌─────────────────────────────────────────────┐ │ │
│ │ │ [Avatar] Prénom Nom                         │ │ │
│ │ │          email@example.com                  │ │ │
│ │ │          [Badge: Compte/Registre/Use Case]  │ │ │
│ │ │                              [Supprimer?]   │ │ │
│ │ └─────────────────────────────────────────────┘ │ │
│ │ ...                                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Badges de Scope

- **Compte** (Violet) : `bg-purple-100 text-purple-700` avec icône Globe
- **Registre** (Vert) : `bg-green-100 text-green-700` avec icône Building2
- **Use Case** (Bleu) : `bg-blue-100 text-blue-700` avec icône FileText

### Messages

- **Empty state** : "Aucun collaborateur pour ce cas d'usage"
- **Loading** : "Chargement des collaborateurs..."
- **Erreur** : Affichage du message d'erreur avec possibilité de réessayer

## 📝 Checklist d'Implémentation

### Phase 1 : Configuration de Base
- [ ] Modifier `app/usecases/[id]/utils/routes.ts` pour ajouter la route collaboration
- [ ] Vérifier que la navigation affiche bien l'onglet "Collaboration"

### Phase 2 : Composants
- [ ] Créer `components/Collaboration/UseCaseCollaboratorList.tsx`
  - [ ] Adapter les scopes (account, registry, usecase)
  - [ ] Adapter les badges et couleurs
  - [ ] Adapter les messages et tooltips
- [ ] Tester le composant en isolation

### Phase 3 : Hook et Logique
- [ ] Créer `app/usecases/[id]/hooks/useUseCaseCollaborators.ts`
  - [ ] Fonction fetch des collaborateurs
  - [ ] Fonction d'invitation
  - [ ] Fonction de suppression
  - [ ] Gestion du state et des erreurs
- [ ] Tester les appels API

### Phase 4 : Page
- [ ] Créer `app/usecases/[id]/collaboration/page.tsx`
  - [ ] Intégrer UseCaseLayout
  - [ ] Intégrer UseCaseCollaboratorList
  - [ ] Intégrer InviteCollaboratorModal
  - [ ] Gérer les permissions d'affichage du bouton "Inviter"
- [ ] Tester le flow complet

### Phase 5 : Tests et Validation
- [ ] Tester l'invitation d'un nouveau collaborateur
- [ ] Tester la suppression d'un collaborateur (scope usecase uniquement)
- [ ] Vérifier que les collaborateurs account/registry ne peuvent pas être supprimés
- [ ] Vérifier les permissions (seul le propriétaire peut inviter/supprimer)
- [ ] Tester le responsive
- [ ] Tester les états de chargement et d'erreur

## 🔄 Flux Utilisateur

### Scénario 1 : Invitation d'un Collaborateur

1. L'utilisateur (propriétaire) clique sur "Collaboration"
2. Il voit la liste des collaborateurs existants avec leurs scopes
3. Il clique sur "Inviter un collaborateur"
4. Il remplit le formulaire (email, prénom, nom)
5. Le système vérifie si l'utilisateur existe
6. Si oui : ajout direct dans `user_usecases`
7. Si non : invitation email + création profile + ajout dans `user_usecases`
8. La liste se rafraîchit avec le nouveau collaborateur

### Scénario 2 : Suppression d'un Collaborateur

1. L'utilisateur (propriétaire) voit un collaborateur avec scope='usecase'
2. Il clique sur l'icône de suppression (UserX)
3. Une confirmation apparaît
4. Après confirmation, l'entrée `user_usecases` est supprimée
5. La liste se rafraîchit

### Scénario 3 : Collaborateur Non Supprimable

1. L'utilisateur voit un collaborateur avec scope='account' ou scope='registry'
2. Au lieu d'un bouton de suppression, un message "Géré globalement" s'affiche
3. Un tooltip explique où gérer ce collaborateur

## 🚀 Améliorations Futures (Optionnelles)

- [ ] Ajouter un filtre par scope
- [ ] Ajouter un champ de recherche
- [ ] Afficher la date d'ajout du collaborateur
- [ ] Ajouter des statistiques (nombre de collaborateurs par scope)
- [ ] Notifications par email lors de l'ajout/suppression
- [ ] Logs d'audit des modifications

## 📚 Références

### Fichiers Clés à Consulter

- **API Routes** :
  - `/app/api/usecases/[id]/collaborators/route.ts`
  - `/app/api/usecases/[id]/collaborators/[collaboratorId]/route.ts`
  - `/app/api/companies/[id]/collaborators/route.ts` (référence)

- **Composants** :
  - `/components/Collaboration/RegistryCollaboratorList.tsx` (modèle)
  - `/components/Collaboration/InviteCollaboratorModal.tsx`

- **Utilitaires** :
  - `/lib/collaborators.ts` (fonctions isOwner, hasAccessToResource)
  - `/lib/invite-user.ts` (fonctions d'invitation)

### Tables Supabase

- `user_usecases` : Relations user ↔ usecase
- `user_companies` : Relations user ↔ company
- `user_profiles` : Relations user ↔ inviter (account-level)
- `profiles` : Informations des utilisateurs
- `usecases` : Cas d'usage
- `companies` : Registres

## ⚠️ Points d'Attention

1. **Performance** : La requête GET combine 3 sources (usecase, company, profile) avec déduplication
2. **Permissions** : Bien vérifier `isOwner` avant toute modification
3. **UX** : Expliquer clairement les différents scopes aux utilisateurs
4. **Cohérence** : Garder le même style que RegistryCollaboratorList
5. **Emails** : L'invitation nécessite une configuration SMTP dans Supabase

## 📋 Notes Techniques

### Gestion des Scopes dans l'API

L'API `/api/usecases/[id]/collaborators` retourne les collaborateurs avec ce format :

```typescript
{
  id: string,
  firstName: string,
  lastName: string,
  role: 'user' | 'owner',
  scope: 'account' | 'registry' | 'usecase',
  addedAt: string
}
```

La déduplication suit cette logique :
```typescript
const scopePriority = { account: 3, registry: 2, usecase: 1 }
```

Si un utilisateur a plusieurs accès, seul le scope le plus élevé est retourné.
