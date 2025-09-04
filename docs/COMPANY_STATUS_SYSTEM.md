# Système de Détermination du Statut d'Entreprise

## 🎯 Vue d'ensemble

Le système de détermination du statut d'entreprise analyse automatiquement les réponses au questionnaire IA Act pour identifier le rôle de l'entreprise dans l'écosystème de l'IA. Cette fonctionnalité est **indépendante du système de scoring** et ne l'affecte pas.

## 🏢 Statuts d'entreprise supportés

| Label de réponse | Statut déterminé | Définition IA Act |
|------------------|------------------|-------------------|
| "Mon entreprise utilise des systèmes d'IA tiers" | `utilisateur` | Déployeur (utilisateur) |
| "Je suis fabricant d'un produit intégrant un système d'IA" | `fabriquant_produits` | Fabricant de Produits |
| "Je distribue et/ou déploie un système d'IA pour d'autres entreprises" | `distributeur` | Distributeur |
| "Je suis importateur d'un système d'IA" | `importateur` | Importateur |
| "Je suis un fournisseur d'un système d'IA" | `fournisseur` | Fournisseur |
| "Je suis représentant autorisé d'un fournisseur de système d'IA" | `mandataire` | Représentant autorisé (Mandataire) |
| "Je suis éditeur d'un logiciel intégrant un système d'IA" | `distributeur` | Distributeur |

## 🔧 Architecture technique

### 1. Logique de détermination

La fonction `determineCompanyStatus()` dans `lib/score-calculator-simple.ts` :
- Parcourt toutes les réponses du questionnaire
- Recherche les labels correspondants aux statuts
- Retourne le premier statut trouvé (priorité aux réponses plus spécifiques)

### 2. Base de données

- **Nouveau champ** : `company_status` dans la table `usecases`
- **Valeurs possibles** : `'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown'`
- **Mise à jour automatique** : Trigger SQL lors des changements de réponses

### 3. API Integration

L'API `/api/usecases/[id]/calculate-score` :
- Détermine le statut d'entreprise lors du calcul de score
- Met à jour le champ `company_status` en base
- Retourne le statut et sa définition dans la réponse

## 📊 Utilisation

### 1. Dans le code TypeScript

```typescript
import { determineCompanyStatus, getCompanyStatusDefinition } from '@/lib/score-calculator-simple';

// Déterminer le statut
const status = determineCompanyStatus(responses);
console.log('Statut:', status); // 'utilisateur', 'fabriquant_produits', etc.

// Obtenir la définition
const definition = getCompanyStatusDefinition(status);
console.log('Définition:', definition);
```

### 2. Dans l'interface utilisateur

```tsx
import CompanyStatusBadge from '@/components/CompanyStatusBadge';

// Badge simple
<CompanyStatusBadge status="utilisateur" />

// Badge avec définition
<CompanyStatusBadge status="fabriquant_produits" showDefinition={true} />
```

### 3. Dans les requêtes API

```typescript
// La réponse de l'API inclut maintenant le statut
const response = await fetch('/api/usecases/123/calculate-score', {
  method: 'POST'
});

const data = await response.json();
console.log('Statut:', data.company_status);
console.log('Définition:', data.company_status_definition);
```

## 🗄️ Migration de la base de données

### Script SQL

Exécuter le script `scripts/add-company-status.sql` dans le SQL Editor de Supabase :

```sql
-- Ajouter la colonne
ALTER TABLE usecases 
ADD COLUMN IF NOT EXISTS company_status TEXT DEFAULT 'unknown' 
CHECK (company_status IN ('utilisateur', 'fabriquant_produits', 'distributeur', 'importateur', 'fournisseur', 'mandataire', 'unknown'));

-- Créer l'index
CREATE INDEX IF NOT EXISTS idx_usecases_company_status ON usecases(company_status);

-- Mettre à jour les cas d'usage existants
SELECT update_all_company_statuses() as updated_usecases_count;
```

### Fonctions SQL créées

- `determine_company_status_from_responses(usecase_id)` : Détermine le statut basé sur les réponses
- `update_all_company_statuses()` : Met à jour tous les cas d'usage existants
- `trigger_update_company_status()` : Trigger automatique lors des changements

## 🎨 Composants UI

### CompanyStatusBadge

Composant React pour afficher le statut d'entreprise avec :
- Badge coloré avec icône
- Option d'affichage de la définition IA Act
- Support de tous les statuts possibles

### Props

```typescript
interface CompanyStatusBadgeProps {
  status: 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown';
  showDefinition?: boolean;
}
```

## 🔍 Exemples d'utilisation

### 1. Dans un tableau de cas d'usage

```tsx
<table>
  <thead>
    <tr>
      <th>Nom</th>
      <th>Statut d'entreprise</th>
      <th>Score</th>
    </tr>
  </thead>
  <tbody>
    {usecases.map(usecase => (
      <tr key={usecase.id}>
        <td>{usecase.name}</td>
        <td>
          <CompanyStatusBadge status={usecase.company_status} />
        </td>
        <td>{usecase.score_final}%</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 2. Dans une page de détail

```tsx
<div className="usecase-details">
  <h1>{usecase.name}</h1>
  <div className="status-section">
    <h2>Statut d'entreprise</h2>
    <CompanyStatusBadge 
      status={usecase.company_status} 
      showDefinition={true} 
    />
  </div>
</div>
```

## 🚀 Déploiement

### Étapes de déploiement

1. **Exécuter le script SQL** dans Supabase
2. **Déployer le code** avec les nouvelles fonctionnalités
3. **Vérifier** que les cas d'usage existants ont un statut déterminé
4. **Tester** avec de nouveaux cas d'usage

### Vérification post-déploiement

```sql
-- Vérifier que tous les cas d'usage ont un statut
SELECT 
  company_status,
  COUNT(*) as count
FROM usecases 
GROUP BY company_status;

-- Vérifier les cas d'usage sans statut
SELECT id, name 
FROM usecases 
WHERE company_status = 'unknown';
```

## 📝 Notes importantes

- **Indépendant du scoring** : Le statut d'entreprise n'affecte pas le calcul de score
- **Automatique** : Déterminé automatiquement lors du calcul de score
- **Réactif** : Mis à jour automatiquement lors des changements de réponses
- **Extensible** : Facile d'ajouter de nouveaux statuts en modifiant la logique

## 🔧 Maintenance

### Ajouter un nouveau statut

1. Ajouter le nouveau statut au type `CompanyStatus`
2. Ajouter la logique dans `determineCompanyStatus()`
3. Ajouter la définition dans `getCompanyStatusDefinition()`
4. Mettre à jour le composant `CompanyStatusBadge`
5. Exécuter une migration SQL pour ajouter la nouvelle valeur

### Debugging

```typescript
// Activer les logs détaillés
console.log('Réponses analysées:', responses);
console.log('Statut déterminé:', companyStatus);
```

