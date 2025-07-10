# Configuration de la clé de service Supabase

## Problème
L'API route `/api/admin/compl-ai-sync` nécessite la clé de service Supabase pour appeler l'Edge Function avec les permissions administrateur.

## Solution

### 1. Récupérer la clé de service depuis Supabase

1. Connectez-vous à votre dashboard Supabase : https://app.supabase.com
2. Sélectionnez votre projet (kzdolxpjysirikcpusrv)
3. Allez dans **Settings** > **API**
4. Dans la section **Project API keys**, copiez la clé **service_role** (attention, c'est une clé sensible !)

### 2. Ajouter la clé à votre fichier `.env.local`

Ajoutez cette ligne à votre fichier `.env.local` :

```env
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_ici
```

### 3. Redémarrer le serveur de développement

```bash
npm run dev
```

## ⚠️ Sécurité importante

- **NE JAMAIS** exposer cette clé côté client (ne pas utiliser `NEXT_PUBLIC_`)
- **NE JAMAIS** commiter cette clé dans Git
- Cette clé donne un accès complet à votre base de données Supabase
- Utilisez-la uniquement côté serveur (API routes, server components)

## Alternative : Utiliser l'anon key avec RLS

Si vous ne souhaitez pas utiliser la clé de service, vous pouvez :

1. Configurer des politiques RLS (Row Level Security) appropriées dans Supabase
2. Utiliser la clé anon déjà présente
3. Modifier l'Edge Function pour accepter les appels avec la clé anon

Mais cela nécessitera des modifications dans l'Edge Function elle-même.