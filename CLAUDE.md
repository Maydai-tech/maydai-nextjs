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
- `usecase_scores`: Scores calculés avec historique

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