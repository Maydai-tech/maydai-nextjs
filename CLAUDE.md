# MaydAI - Guide de Développement Claude

## 🎯 Vue d'ensemble du projet

MaydAI est une application SaaS de conformité IA Act européen développée avec Next.js 15.3.3. L'application permet aux entreprises d'évaluer la conformité de leurs systèmes IA avec la réglementation européenne via un questionnaire guidé et un système de scoring automatisé.

## 🛠️ Stack technologique

### Core
- **Framework**: Next.js 15.3.3 avec App Router
- **React**: Version 19
- **TypeScript**: Configuration stricte
- **Base de données**: Supabase (Auth + Database)
- **Styling**: Tailwind CSS v4
- **Tests**: Jest + Testing Library

### Dépendances principales
- `@supabase/supabase-js`: Client Supabase pour auth et BDD
- `lucide-react` & `react-icons`: Bibliothèques d'icônes
- `airtable`: Intégration Airtable (optionnelle)

## 📁 Structure du projet

```
/app                    # App Router de Next.js
  /api                  # API Routes
  /admin               # Pages d'administration
  /companies           # Gestion des entreprises
  /dashboard           # Tableaux de bord
  /usecases           # Fonctionnalité principale (évaluation IA)
  /[pages publiques]   # Pages statiques (accueil, tarifs, etc.)

/components            # Composants React réutilisables
/lib                   # Logique métier et utilitaires
/public               # Assets statiques
/scripts              # Scripts utilitaires
/docs                 # Documentation
```

## 🚀 Commandes de développement

```bash
# Développement
npm run dev             # Démarre le serveur de développement (port 3000)

# Build et production
npm run build          # Build l'application pour la production
npm run start          # Démarre le serveur de production

# Tests et qualité
npm run test           # Lance tous les tests
npm run test:watch     # Mode watch pour les tests
npm run test:coverage  # Tests avec rapport de couverture
npm run lint           # Vérifie le code avec ESLint

# Déploiement Vercel
vercel                 # Déploie sur Vercel (preview)
vercel --prod          # Déploie en production
vercel env pull        # Récupère les variables d'environnement

# Scripts utilitaires
node scripts/test-scoring.js      # Test rapide du système de scoring
node scripts/migrate-scores.js    # Migration des scores (si nécessaire)
```

## 🔐 Variables d'environnement requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Airtable (optionnel)
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
```

### Configuration Vercel

Pour configurer le déploiement automatique sur Vercel :

1. **Variables d'environnement Vercel** :
   - Aller sur [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sélectionner le projet MaydAI
   - Dans "Settings" > "Environment Variables", ajouter :
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `AIRTABLE_API_KEY` (optionnel)
     - `AIRTABLE_BASE_ID` (optionnel)

2. **Déploiement automatique** :
   - Dans "Settings" > "Git", vérifier que :
     - La branche de production est `main`
     - "Automatic deployments" est activé
     - "Deploy Hooks" configurés si nécessaire

3. **Configuration locale** :
   ```bash
   # Lier le projet local à Vercel
   vercel link
   
   # Récupérer les variables d'environnement
   vercel env pull
   ```

## 🏗️ Architecture principale

### 1. **Authentification**
- Gérée par Supabase Auth
- Context Provider: `/lib/auth.tsx`
- Protection des routes: `ProtectedRoute` et `AdminProtectedRoute`
- Support email/password et OTP

### 2. **Structure multi-tenant**
- Chaque utilisateur appartient à une entreprise (company)
- Isolation complète des données entre entreprises
- Dashboard spécifique par entreprise: `/dashboard/[id]`

### 3. **Système de Use Cases**
- Représente un système IA à évaluer
- Statuts: draft, in_progress, completed
- Classification: risk_level, ai_category, system_type
- Questionnaire d'évaluation structuré en sections

### 4. **Système de scoring**
- Score de base: 100 points
- Impacts négatifs selon les réponses (-5 à -50 points)
- Bonus pour certaines pratiques (+10 points)
- Calcul par catégorie de risque avec pondération
- Fichiers clés:
  - `/app/usecases/[id]/utils/score-calculator.ts`
  - `/app/usecases/[id]/utils/scoring-config.ts`
  - `/app/usecases/[id]/utils/risk-categories.ts`

### 5. **API Routes**
- `/api/companies/*`: CRUD des entreprises
- `/api/usecases/*`: Gestion des cas d'usage
- `/api/admin/*`: Routes d'administration
- Authentification via Bearer token

## 📊 Base de données Supabase

### Tables principales
- `profiles`: Profils utilisateurs avec company_id
- `companies`: Entreprises enregistrées
- `usecases`: Cas d'usage IA
- `usecase_responses`: Réponses au questionnaire (structure Array)

### Structure des réponses
```typescript
{
  question_code: string;
  single_value?: string;      // Réponse radio
  multiple_codes?: string[];  // Réponses checkbox
  conditional_main?: string;  // Réponse conditionnelle
  conditional_details?: string;
}
```

## 🧪 Tests

Le projet inclut des tests unitaires complets pour le système de scoring:
- Configuration de scoring
- Catégories de risque
- Calculateur de score
- Cas limites et gestion d'erreurs

Lancer les tests: `npm test`

## 🔒 Sécurité

- En-têtes de sécurité configurés dans `next.config.ts`
- Protection CSRF, XSS, clickjacking
- Variables d'environnement pour les secrets
- Validation des permissions à chaque niveau
- Documentation complète dans `/SECURITY.md`

## 🎨 Composants principaux

### Questionnaire
- `EvaluationQuestionnaire`: Vue d'ensemble avec édition inline
- `StepByStepQuestionnaire`: Navigation question par question
- `QuestionRenderer`: Rendu adaptatif selon le type

### Score
- `UseCaseScore`: Affichage du score global
- `CategoryScores`: Détail par catégorie
- `CompactScore`: Vue compacte pour listes

### Layout
- `Header`: Navigation principale
- `Sidebar`: Navigation contextuelle
- `Footer`: Liens légaux

## 📝 Types TypeScript importants

```typescript
// Cas d'usage
interface UseCase {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  risk_level?: string;
  ai_category?: string;
  system_type?: string;
  status: 'draft' | 'in_progress' | 'completed';
  // ...
}

// Question du questionnaire
interface Question {
  code: string;
  text: string;
  type: 'radio' | 'checkbox' | 'conditional';
  options: QuestionOption[];
  // ...
}

// Score
interface UseCaseScore {
  score: number;
  category_scores: CategoryScore[];
  score_breakdown: Array<{
    question_code: string;
    impact: number;
    reason: string;
  }>;
}
```

## 🚦 Workflow de développement

1. **Création d'une feature**:
   - Créer une branche depuis `main` ou `thomas`
   - Développer et tester localement
   - Vérifier avec `npm run lint` et `npm test`

2. **Ajout d'une nouvelle page**:
   - Créer le dossier dans `/app`
   - Ajouter `page.tsx` et optionnellement `layout.tsx`
   - Protéger si nécessaire avec `ProtectedRoute`

3. **Modification du questionnaire**:
   - Modifier les données dans `/app/usecases/[id]/data/`
   - Mettre à jour `scoring-config.ts` si impact sur le scoring
   - Ajouter des tests unitaires

## 🔍 **CRITICAL: Procédure de merge depuis la branche THOMAS**

⚠️ **ATTENTION**: La branche `thomas` est mise à jour par un utilisateur non-technique utilisant Cursor. Suivre IMPÉRATIVEMENT cette checklist avant tout merge.

### Pre-merge Checklist Thomas → Dev

#### 1. **📁 Vérification des Assets et Fichiers**
```bash
# Vérifier les noms de fichiers problématiques
find . -name "* *" -o -name "*é*" -o -name "*è*" -o -name "*à*" -o -name "*ç*"

# Vérifier les nouveaux fichiers ajoutés
git diff dev..thomas --name-status | grep "^A"
```

**Points critiques à vérifier** :
- [ ] Aucun fichier avec espaces dans le nom
- [ ] Aucun caractère spécial/accent dans les noms de fichiers
- [ ] Nouveaux assets dans `/public/` correctement nommés (kebab-case)
- [ ] Images optimisées (< 500KB, formats web)

#### 2. **🖼️ Vérification des Références d'Images**
```bash
# Chercher les nouvelles références d'images
grep -r "\.png\|\.jpg\|\.svg\|\.webp" components/ app/ --include="*.jsx" --include="*.tsx"
```

**À vérifier** :
- [ ] Tous les chemins d'images utilisent la nomenclature `kebab-case`
- [ ] Aucun chemin avec espaces ou caractères spéciaux
- [ ] Images référencées existent bien dans `/public/`
- [ ] Attributs `alt` présents et descriptifs

#### 3. **🔧 Vérification Technique**
```bash
# Test de build obligatoire
npm run build

# Test de lint obligatoire  
npm run lint

# Test des fonctionnalités critiques
npm test
```

**Points de contrôle** :
- [ ] Build Next.js réussi sans erreurs
- [ ] Aucune erreur ESLint critique
- [ ] Tests unitaires passent
- [ ] Aucune erreur TypeScript

#### 4. **🌐 Vérification de Production**
```bash
# Simuler l'environnement de production
npm run build && npm run start
```

**À tester manuellement** :
- [ ] Page d'accueil charge sans erreur
- [ ] Navigation fonctionne
- [ ] Images s'affichent correctement
- [ ] Console browser sans erreurs 500/CSP
- [ ] Fonctionnalités principales accessibles

#### 5. **📊 Vérification du Contenu**
**Changements de contenu à valider** :
- [ ] Nouveaux textes cohérents avec le tone of voice
- [ ] Pas de fautes d'orthographe/grammaire
- [ ] Structure HTML sémantique respectée
- [ ] Accessibilité maintenue (contraste, alt text)

#### 6. **🔄 Procédure de Merge Sécurisée**

**Étape 1: Préparation**
```bash
# Sauvegarder dev actuel
git checkout dev
git branch backup-dev-$(date +%Y%m%d-%H%M%S)

# Merger dev dans thomas d'abord (résolution des conflits)
git checkout thomas
git pull origin thomas
git merge dev
# Résoudre les conflits si nécessaire
git push origin thomas
```

**Étape 2: Merge vers dev**
```bash
# Merger thomas dans dev
git checkout dev
git merge thomas
```

**Étape 3: Vérification post-merge**
```bash
# Re-test complet après merge
npm run build
npm run lint
npm test

# Test manuel de l'application
npm run dev
```

#### 7. **🚨 Actions en cas de Problème**

**Si erreurs de build/deploy** :
1. Identifier les fichiers problématiques avec `git diff dev~1..dev --name-only`
2. Renommer fichiers avec caractères spéciaux : `scripts/rename-assets.sh`
3. Mettre à jour les références dans le code
4. Commit de correction immédiat

**Si erreurs CSP/Headers** :
1. Vérifier `middleware.ts` non modifié
2. Contrôler `next.config.ts` non cassé
3. S'assurer aucun nouveau header Link avec caractères spéciaux

**Si régression fonctionnelle** :
1. Rollback immédiat : `git revert HEAD`
2. Identifier le commit problématique
3. Fix ciblé puis nouveau merge

### 📋 Template de Commit Post-Merge Thomas

```
feat/fix: Merge thomas - [Description courte des changements]

Changements depuis thomas:
- [ ] Assets: [décrire nouveaux fichiers]
- [ ] Contenu: [décrire modifications texte/images] 
- [ ] Technique: [décrire impacts code]

Vérifications effectuées:
✅ Build réussi
✅ Lint passé  
✅ Tests OK
✅ Assets nommés correctement
✅ Aucune erreur production

Co-authored-by: Thomas <thomas@mayday-consulting.ai>
🤖 Generated with [Claude Code](https://claude.ai/code)
```

### 🎯 Scripts Utilitaires pour Thomas

**Script de vérification pré-merge** :
```bash
# Lancer avant chaque merge depuis thomas
./scripts/check-thomas-merge.sh
```

Ce script vérifie automatiquement :
- Noms de fichiers problématiques
- Nouveaux assets ajoutés
- Références d'images dans le code
- Build, lint et tests
- Génère un rapport de vérification

### 📝 **Guide pour les Contributeurs Non-Techniques (Thomas)**

#### ✅ **RÈGLES D'OR - À RESPECTER ABSOLUMENT**

1. **Nommage des fichiers** :
   - ❌ `Logo MaydAI.png` ❌ `Image été.jpg` 
   - ✅ `logo-maydai.png` ✅ `image-ete.jpg`
   - Utiliser uniquement : lettres minuscules, chiffres, tirets (-)

2. **Ajout d'images** :
   - Toujours placer dans `/public/logos/` ou `/public/images/`
   - Optimiser avant ajout (< 500KB)
   - Formats recommandés : `.webp`, `.png`, `.jpg`

3. **Modification de contenu** :
   - Modifier uniquement les textes dans les composants
   - Ne jamais toucher aux fichiers `.ts`, `.js` de configuration
   - Préserver la structure HTML existante

4. **Avant de push** :
   - Tester localement avec `npm run dev`
   - Vérifier que toutes les images s'affichent
   - S'assurer qu'aucune erreur n'apparaît en console

#### 🚫 **INTERDICTIONS ABSOLUES**

- Ne JAMAIS modifier `middleware.ts`, `next.config.ts`
- Ne JAMAIS renommer des dossiers existants
- Ne JAMAIS supprimer des fichiers sans validation
- Ne JAMAIS ajouter de packages npm
- Ne JAMAIS modifier les types TypeScript

#### 📞 **Quand demander de l'aide technique**

- Erreurs de build/compilation
- Pages qui ne s'affichent plus
- Images qui ne se chargent pas
- Erreurs en console navigateur
- Problèmes de routing/navigation

#### 🔧 **Cursor - Configuration et Règles**

**Règles Cursor Spécialisées (dans `.cursor/rules/`)** :
- `thomas-non-technical-safety.mdc` - Règles de sécurité critiques
- `asset-management-safety.mdc` - Gestion sécurisée des fichiers/images
- `thomas-workflow-guidance.mdc` - Guide de workflow détaillé
- `production-safety-checks.mdc` - Vérifications pré-merge

**Paramètres VS Code/Cursor recommandés** :
```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/.next/**": true
  },
  "eslint.autoFixOnSave": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 🎯 **Workflow Thomas - Étapes Recommandées**

1. **Avant de commencer** :
   ```bash
   git checkout thomas
   git pull origin thomas
   npm run dev  # Vérifier que tout fonctionne
   ```

2. **Pendant les modifications** :
   - Faire des commits fréquents avec messages clairs
   - Tester après chaque modification importante
   - Éviter les gros changements d'un coup

3. **Avant de push** :
   ```bash
   npm run build  # Vérifier que ça build
   git add .
   git commit -m "feat: Description claire du changement"
   git push origin thomas
   ```

4. **Après le push** :
   - Informer l'équipe technique pour le merge
   - Fournir une liste des changements effectués

## 🐛 Debugging

- Logs Supabase dans la console navigateur
- Vérifier les tokens d'authentification dans les headers
- Utiliser les outils de développement React
- Tests unitaires pour le scoring: `npm run test:watch`

## 📚 Ressources importantes

- **Documentation Next.js**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **AI Act EU**: Réglementation européenne sur l'IA

## ⚡ Tips pour Claude

1. **Toujours vérifier l'authentification** avant d'accéder aux données
2. **Utiliser les types TypeScript** pour éviter les erreurs
3. **Suivre les conventions** du code existant
4. **Tester les modifications** du scoring avec les tests unitaires
5. **Optimiser les requêtes** Supabase (utiliser select pour limiter les données)
6. **Gérer les erreurs** avec try/catch et feedback utilisateur
7. **Respecter l'isolation** des données entre entreprises

## 🎯 Fonctionnalités clés à connaître

1. **Évaluation de conformité**: Questionnaire multi-sections avec scoring automatique
2. **Dashboard entreprise**: Vue d'ensemble des cas d'usage et statistiques
3. **Gestion multi-tenant**: Isolation complète entre entreprises
4. **Système de scoring**: Calcul complexe avec catégories de risque
5. **Export des résultats**: (À implémenter selon les besoins)

Ce guide devrait vous permettre de comprendre rapidement l'architecture et de contribuer efficacement au projet MaydAI.