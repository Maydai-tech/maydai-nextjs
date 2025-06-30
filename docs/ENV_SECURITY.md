# Guide de Sécurité - Variables d'Environnement

## 🚨 Problème Identifié

Le système précédent présentait des risques de sécurité concernant la gestion des variables d'environnement :
- Risque de commit accidentel de `.env.local` avec des secrets
- Manque de séparation entre environnements dev/prod
- Pas de template pour guider la configuration

## ✅ Solution Implémentée

### 1. Templates d'Environnement

**Fichiers créés :**
- `.env.example` : Template général avec documentation
- `.env.development.example` : Variables spécifiques au développement
- `.env.production.example` : Variables spécifiques à la production

### 2. .gitignore Renforcé

**Avant :**
```gitignore
# env files (can opt-in for committing if needed)
.env*
```

**Après :**
```gitignore
# env files - CRITIQUES à ne jamais committer
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Autoriser uniquement le template
!.env.example
```

### 3. Séparation des Environnements

**Développement :**
- URL Supabase de développement
- Clés d'API de test
- Debug activé
- Logs verbeux

**Production :**
- URL Supabase de production
- Clés d'API sécurisées
- Monitoring activé
- Variables de sécurité additionnelles

## 🛠️ Instructions de Configuration

### Pour un Nouveau Développeur

1. **Cloner le repository**
```bash
git clone [repo-url]
cd maydai-nextjs
```

2. **Configurer l'environnement local**
```bash
# Copier le template
cp .env.example .env.local

# OU pour un environnement spécifique
cp .env.development.example .env.local
```

3. **Remplir les variables**
- Remplacer toutes les valeurs par les vraies valeurs
- Récupérer les clés Supabase depuis le dashboard
- Configurer l'URL de l'application

### Pour le Déploiement en Production

1. **Variables à configurer sur la plateforme d'hébergement :**
```env
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-key
NEXT_PUBLIC_SITE_URL=https://maydai.com
NODE_ENV=production
```

2. **Variables optionnelles pour le monitoring :**
```env
WEBHOOK_SECRET=secure-random-string
SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_ANALYTICS_ID=GA-MEASUREMENT-ID
```

## 🔍 Audit de Sécurité

### Vérifications Automatiques

```bash
# Vérifier qu'aucun secret n'est committé
git log --all --full-history -- .env*

# Rechercher des variables sensibles dans le code
grep -r "sk-\|pk_\|secret" --exclude-dir=node_modules .

# Vérifier le .gitignore
git check-ignore .env.local
```

### Check-list de Sécurité

- [ ] ✅ `.env.local` est dans `.gitignore`
- [ ] ✅ Aucun fichier `.env*` n'est tracké par git
- [ ] ✅ Templates `.env.example` disponibles
- [ ] ✅ Variables séparées par environnement
- [ ] ✅ Documentation claire pour la configuration

## 🚨 En Cas de Compromission

### Si des secrets ont été committés par accident :

1. **Faire un audit complet :**
```bash
git log --all --full-history -- .env*
git show [commit-hash]
```

2. **Révoquer immédiatement :**
- Régénérer les clés Supabase
- Changer les tokens d'API tiers
- Mettre à jour les variables en production

3. **Nettoyer l'historique (si nécessaire) :**
```bash
# ATTENTION : Opération destructrice
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch .env.local' \
--prune-empty --tag-name-filter cat -- --all
```

## 📋 Maintenance Continue

### Actions Régulières

1. **Audit mensuel des variables**
2. **Rotation des clés sensibles**
3. **Vérification des accès Supabase**
4. **Review des logs d'authentification admin**

### Monitoring

- Surveiller les tentatives d'accès non autorisées
- Alertes sur les modifications de variables critiques
- Logs d'audit des actions admin

## 🔗 Ressources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OWASP Application Security](https://owasp.org/www-project-application-security-verification-standard/)