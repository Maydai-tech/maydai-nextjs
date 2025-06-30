# Tests Cypress E2E - MaydAI

## 🎯 Vue d'ensemble

Cette suite de tests Cypress E2E valide la fonctionnalité complète du système de scoring par catégorie de risque de MaydAI. Les tests couvrent la création de cas d'usage, les calculs de scores, et la cohérence des résultats.

## 🧪 Types de tests

### 1. **Tests de création de cas d'usage** (`usecase-creation.cy.ts`)
- ✅ Création de nouveaux cas d'usage
- ✅ Navigation dans le questionnaire
- ✅ Sauvegarde en mode brouillon
- ✅ Validation des champs requis

### 2. **Tests du système de scoring** (`scoring-system.cy.ts`)
- ✅ Calculs de scores pour différents scénarios
- ✅ Vérification des scores par catégorie de risque
- ✅ Détail du breakdown de scoring
- ✅ Validation des poids de catégories
- ✅ Gestion des cas limites (scores min/max)
- ✅ Cohérence après rafraîchissement

### 3. **Tests de la page de résultats** (`results-page.cy.ts`)
- ✅ Affichage complet des résultats
- ✅ Analyse détaillée par catégorie
- ✅ Évaluation du niveau de risque
- ✅ Recommandations personnalisées
- ✅ Export des résultats (PDF/CSV)
- ✅ Comparaison entre cas d'usage
- ✅ Intégrité des données entre sessions

### 4. **Tests d'intégration** (`integration-tests.cy.ts`)
- ✅ Workflow complet d'évaluation
- ✅ Gestion de cas d'usage concurrents
- ✅ Validation de la cohérence des calculs
- ✅ Gestion des cas d'erreur
- ✅ Navigation et suivi de progression
- ✅ Évaluation de conformité précise

## 🚀 Configuration et lancement

### Installation
```bash
npm install --save-dev cypress @cypress/code-coverage nyc
```

### Scripts disponibles
```bash
# Ouvrir l'interface Cypress
npm run e2e:open

# Lancer tous les tests E2E
npm run e2e

# Lancer les tests en mode headless
npm run cypress:run

# Ouvrir Cypress GUI
npm run cypress:open
```

### Variables d'environnement
```env
# Supabase (requis pour les tests)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Configuration des tests
- **Base URL**: `http://localhost:3000`
- **Viewport**: 1280x720
- **Timeout**: 10 secondes
- **Screenshots**: Activés en cas d'échec
- **Vidéos**: Désactivées (configurable)

## 📊 Scénarios de test

### Scénarios pré-configurés (fixtures)

1. **Chatbot Client Service**
   - Score attendu: 110/100 (bonus inclus)
   - Catégories: Technical Robustness, Privacy & Data
   - Niveau de risque: Limité

2. **Système de Reconnaissance Faciale**
   - Score attendu: 60/100
   - Catégories: Technical Robustness, Human Agency
   - Niveau de risque: Élevé

3. **Système de Notation Sociale**
   - Score attendu: 50/100
   - Catégories: Prohibited Practices
   - Niveau de risque: Interdit

4. **Assistant IA avec Données Sensibles**
   - Score attendu: 80/100
   - Catégories: Privacy & Data, Diversity & Fairness
   - Niveau de risque: Élevé

## 🛠️ Commandes personnalisées

### Authentification
```typescript
cy.login('test@maydai.com', 'password123')
```

### Gestion des cas d'usage
```typescript
cy.createUseCase('Nom du cas', 'Description optionnelle')
```

### Réponses au questionnaire
```typescript
cy.answerQuestion('E4.N8.Q1', 'E4.N8.Q1.A')
```

### Vérification des scores
```typescript
cy.verifyScore(95, 100) // Score attendu, Score maximum
cy.verifyCategoryScores() // Vérifie toutes les catégories
```

## 🏗️ Structure des tests

```
cypress/
├── e2e/
│   ├── usecase-creation.cy.ts     # Tests de création
│   ├── scoring-system.cy.ts       # Tests de scoring
│   ├── results-page.cy.ts         # Tests de résultats
│   └── integration-tests.cy.ts    # Tests d'intégration
├── fixtures/
│   └── test-scenarios.json        # Données de test
├── support/
│   ├── commands.ts                # Commandes personnalisées
│   ├── e2e.ts                     # Configuration globale
│   └── index.d.ts                 # Types TypeScript
└── cypress.config.ts              # Configuration Cypress
```

## 📈 Validation des calculs

### Système de scoring testé
- **Score de base**: 100 points
- **Impacts négatifs**: -5 à -50 points selon la gravité
- **Bonus**: +10 points pour certaines pratiques
- **Score minimum**: 0 (jamais négatif)

### Catégories de risque validées
- 🔍 **Transparence** (15%) - Questions d'explicabilité
- 🛡️ **Robustesse Technique** (20%) - Sécurité et fiabilité
- 👥 **Supervision Humaine** (18%) - Contrôle humain
- 🔒 **Confidentialité & Données** (17%) - Protection des données
- 🌱 **Impact Social & Environnemental** (10%) - Bien-être
- ⚖️ **Équité & Non-discrimination** (15%) - Équité
- 🚫 **Pratiques Interdites** (5%) - Pratiques prohibées

## 🚨 Points de vigilance

1. **Pré-requis**: Serveur de développement actif (`npm run dev`)
2. **Données de test**: Isolation complète entre tests
3. **Authentification**: Utilise des comptes de test dédiés
4. **Performance**: Tests optimisés pour éviter les timeouts
5. **Nettoyage**: Données de test automatiquement nettoyées

## 📋 Checklist de validation

- [ ] ✅ Création de cas d'usage
- [ ] ✅ Calculs de scores corrects
- [ ] ✅ Découpage par catégorie de risque
- [ ] ✅ Cohérence des résultats
- [ ] ✅ Interface utilisateur responsive
- [ ] ✅ Gestion des erreurs
- [ ] ✅ Persistence des données
- [ ] ✅ Export des résultats

## 🔧 Debugging

### Logs utiles
```bash
# Voir les logs Cypress
npm run cypress:open

# Mode debug avec plus de détails
DEBUG=cypress:* npm run e2e
```

### Sélecteurs de test
Les tests utilisent des attributs `data-cy` pour une sélection fiable :
```typescript
cy.get('[data-cy=total-score]')
cy.get('[data-cy=category-score-transparency]')
cy.get('[data-cy=breakdown-E4.N8.Q1]')
```

## 📚 Ressources

- [Documentation Cypress](https://docs.cypress.io)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [API Commands](https://docs.cypress.io/api/table-of-contents)

Cette suite de tests garantit la fiabilité et la précision du système de scoring MaydAI à travers des scénarios réalistes et une couverture complète des fonctionnalités.