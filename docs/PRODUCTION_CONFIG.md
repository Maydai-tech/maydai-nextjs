# Configuration de Production - MaydAI

## 🔐 Variables d'Environnement Requises

### 1. Créer le fichier `.env.local`

```bash
# Copier le template
cp docs/PRODUCTION_CONFIG.md .env.local
# Puis éditer .env.local avec tes vraies valeurs
```

### 2. Variables Stripe (Production)

Récupère ces clés depuis ton **dashboard Stripe en mode Live** :

```env
# Clé secrète Stripe (commence par sk_live_)
STRIPE_SECRET_KEY=sk_live_ton_cle_secrete_ici

# Clé publique Stripe (commence par pk_live_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_ton_cle_publique_ici

# Secret du webhook Stripe (commence par whsec_)
STRIPE_WEBHOOK_SECRET=whsec_ton_secret_webhook_ici
```

### 3. Variables Supabase (Production)

Récupère ces valeurs depuis ton **dashboard Supabase (projet de production)** :

```env
# URL de ton projet Supabase de production
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet-prod.supabase.co

# Clé anonyme Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=ton_anon_key_production_ici

# Clé de service Supabase (pour les opérations admin)
SUPABASE_SERVICE_ROLE_KEY=ton_service_role_key_production_ici
```

### 4. Variables Application

```env
# URL de ton application en production
NEXT_PUBLIC_APP_URL=https://ton-domaine.com

# Environnement
NODE_ENV=production
```

## 🚀 Étapes de Configuration

### Étape 1 : Récupérer les Clés Stripe

1. **Va sur** [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Bascule en mode Live** (en haut à droite)
3. **Développeurs > Clés API**
4. **Copie** :
   - `Clé secrète` → `STRIPE_SECRET_KEY`
   - `Clé publique` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Étape 2 : Configurer les Webhooks Stripe

1. **Développeurs > Webhooks > Ajouter un endpoint**
2. **URL** : `https://ton-domaine.com/api/stripe/webhook`
3. **Événements à envoyer** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. **Copie le secret** → `STRIPE_WEBHOOK_SECRET`

### Étape 3 : Récupérer les Clés Supabase

1. **Va sur** [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Sélectionne ton projet de production**
3. **Settings > API**
4. **Copie** :
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### Étape 4 : Tester en Local

```bash
# 1. Créer le fichier .env.local avec tes valeurs
# 2. Redémarrer le serveur
npm run dev

# 3. Tester la page de diagnostic
# http://localhost:3000/test-stripe-sync

# 4. Tester une vraie session Stripe
# http://localhost:3000/test-stripe
```

### Étape 5 : Déployer sur Vercel

1. **Va sur** [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Sélectionne ton projet**
3. **Settings > Environment Variables**
4. **Ajoute toutes les variables** de `.env.local`
5. **Déploie** : `git push origin main`

## ✅ Checklist de Validation

- [ ] Clés Stripe Live configurées
- [ ] Webhook Stripe configuré avec la bonne URL
- [ ] Clés Supabase de production configurées
- [ ] URL de l'application mise à jour
- [ ] Test en local réussi
- [ ] Déploiement Vercel réussi
- [ ] Test de paiement en production réussi

## 🚨 Sécurité

- **JAMAIS** committer `.env.local`
- **JAMAIS** partager les clés secrètes
- **TOUJOURS** utiliser HTTPS en production
- **VÉRIFIER** que les webhooks utilisent HTTPS

## 🔧 Dépannage

### Erreur "Invalid API Key"
- Vérifier que tu utilises les clés **Live** (pas Test)
- Vérifier qu'il n'y a pas d'espaces dans les clés

### Erreur "Webhook signature verification failed"
- Vérifier que le secret du webhook est correct
- Vérifier que l'URL du webhook est accessible

### Erreur "supabaseUrl is required"
- Vérifier que `NEXT_PUBLIC_SUPABASE_URL` est définie
- Redémarrer le serveur après modification

## 📞 Support

En cas de problème, vérifier :
1. Les logs du serveur (`npm run dev`)
2. Les logs Vercel (dashboard Vercel)
3. Les logs Stripe (dashboard Stripe > Webhooks)
4. Les logs Supabase (dashboard Supabase > Logs)
