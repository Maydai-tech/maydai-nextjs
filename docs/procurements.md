# Procurements — création et dashboard

La home `/dashboard/registries` affiche les appels d’offres personnels après les
registres, même sans registre. Les titres ouvrent `/procurements/[id]`, le menu à
trois points conserve la suppression avec confirmation du titre. Aucun quota de
registre ne s’applique. Les confirmations utilisent un toast de 5 secondes.

## Formulaire et configuration

`/procurements/new` comporte quatre sections : contexte, critères Maydai,
questions sur mesure, fournisseurs et échéance. Une création exige :

- un titre nettoyé de 1 à 200 caractères et un besoin de 1 à 5 000 caractères ;
- une phase : Consultation (par défaut), RFI, RFP ou Phase finale ;
- les six importances entières entre 0 et 10, initialisées à 5 ; 0 conserve le critère ;
- au moins un email fournisseur valide, nettoyé, dédupliqué sans distinction de casse ;
- une échéance future, saisie en Europe/Paris et enregistrée en UTC. Heure proposée : 18 h.

Les questions sont facultatives. Chaque question ajoutée exige un intitulé. Les
types sont texte court, texte long, choix unique, choix multiple et fichier ; les
choix exigent au moins deux options distinctes. Les questions peuvent être
réordonnées avec les boutons monter/descendre. Le type fichier configure une
réponse future, sans téléversement. L’email encore saisi est traité à la soumission.
La saisie est conservée en cas d’échec ; les erreurs sont reliées aux champs et à
un résumé accessible. Une soumission en cours bloque les doubles clics.

Après création, navigation vers le dashboard de l’objet retourné. Il présente
la configuration persistée, les fournisseurs « Non invité », leur nombre réel,
zéro invitation, zéro réponse et un taux de réponse indisponible. Les blocs
réponses et évaluations affichent des états vides. La navigation dédiée mène aux
sections vue d’ensemble, fournisseurs et configuration, et au compte.

Cette version ne produit aucune synthèse IA, aucun score pondéré, aucun email,
aucune invitation ni réponse fournisseur. Elle n’ajoute aucun droit de modification.
Les anciens appels incomplets restent lisibles : « Non renseigné » pour les champs
historiques manquants, sans inventer de configuration.

## Données et API

`public.procurements` contient `id`, `user_id`, `title`, `description`, `created_at`,
`phase`, `criteria_importance` (JSONB), `custom_questions` (JSONB), `deadline_at`
(timestamptz) et `supplier_emails` (text[]). La configuration est enregistrée en
une seule insertion atomique. La validation partagée est dans
`lib/validations/procurement.ts` ; la conversion Paris/UTC dans
`lib/validations/procurement-deadline.ts` (dates invalides et heures inexistantes
au passage à l’heure d’été refusées).

Le propriétaire provient de la session vérifiée côté serveur. Le client
applicatif utilise le token utilisateur et respecte la RLS : SELECT, INSERT et
DELETE réservés au propriétaire ; aucun accès anonyme ni UPDATE.

- `GET /api/procurements` : liste personnelle, du plus récent au plus ancien.
- `POST /api/procurements` : configuration complète obligatoire, objet créé et statut 201.
- `GET /api/procurements/:id` : objet personnel, 404 si absent ou inaccessible.
- `DELETE /api/procurements/:id` : suppression personnelle, 204 ; 404 si absent ou inaccessible.
- Erreurs : 400 pour saisie invalide (avec chemins des champs), 401 pour session invalide, 500 pour erreur de stockage.

La liste et le dashboard se chargent côté serveur. Les erreurs proposent une
nouvelle tentative via les GET. Une erreur de liste laisse le reste de la home
utilisable. Les fichiers `page.tsx` restent des points d’entrée minimaux.

## Migrations OVH

Les migrations suivantes ont été appliquées individuellement sur OVH et
inscrites dans l’historique, sans push global :

1. `20261009141528_create_procurements.sql` : table, index et RLS.
2. `20261009143724_allow_procurement_owner_deletion.sql` : suppression personnelle.
3. `20261009153010_enrich_procurements.sql` : configuration additive compatible avec les anciens appels.

Suivre [la configuration OVH](supabase-ovh-cli.md) et utiliser le wrapper
`npm run supabase:ovh -- …`. Ne pas faire de push global tant que les historiques
divergent. Chaque migration notifie PostgREST pour recharger son schéma.
Le CLI actuel n’accepte qu’une instruction par `query -f` : le fichier ciblé et
son enregistrement dans l’historique peuvent être enveloppés dans un bloc
`DO $migration$ BEGIN … END $migration$;`. Ne pas réappliquer une migration enregistrée.

## Vérification

```bash
pnpm exec jest --runInBand --runTestsByPath lib/validations/__tests__/procurement.test.ts app/api/procurements/__tests__/route.test.ts 'app/api/procurements/[id]/__tests__/get-procurement.test.ts' 'app/api/procurements/[id]/__tests__/delete-procurement.test.ts'
pnpm exec jest --runInBand --runTestsByPath app/procurements/components/__tests__/*.test.tsx app/dashboard/registries/components/__tests__/*.test.tsx components/__tests__/Toast.test.tsx
npm run supabase:ovh -- query -f supabase/tests/procurements_rls.sql
pnpm exec tsc --noEmit
```

Les suites couvrent la validation complète, les bornes 0/10, les options,
les emails, Paris/UTC, les API personnelles, la conservation après échec,
les doubles soumissions, les anciens appels, les erreurs/reprises et les toasts.
Le SQL crée deux comptes temporaires et annule ses données : isolation, refus
d’insertion au nom d’autrui, refus d’UPDATE, DELETE du propriétaire, absence d’accès
anonyme. Une intégration avec deux utilisateurs temporaires vérifie également
la persistance complète et les GET réels via l’application et directement Supabase.

Vérification navigateur : création → dashboard → rechargement → home → dashboard,
curseurs au clavier, réordonnancement, type fichier sans upload et affichage à
375, 768, 1 024 et 1 440 px. Le contrôle TypeScript de cette branche `preprod` passe. Sa suite globale
comporte des échecs préexistants de logique de scoring / statuts ; les tests
ciblés Procurements passent. La fonctionnalité est adaptée à l’organisation
de routes existante de `preprod` (sans groupe `(saas)`), sans fusion des changements
ultérieurs de `main`.
