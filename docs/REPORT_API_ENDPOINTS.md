# API Endpoints pour les Rapports d'Analyse IA

## 📋 Vue d'ensemble

Cette documentation décrit les endpoints API disponibles pour la génération et la gestion des rapports d'analyse de conformité IA Act.

## 🔗 Endpoints Disponibles

### 1. POST `/api/generate-report`
**Génère un nouveau rapport d'analyse**

#### Requête
```bash
curl -X POST http://localhost:3000/api/generate-report \
  -H "Content-Type: application/json" \
  -d '{"usecase_id": "123e4567-e89b-12d3-a456-426614174000"}'
```

#### Réponse
```json
{
  "report": "**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**\n\n**Informations du cas d'usage :**\n- Nom : Mon Système IA\n- ID : 123e4567-e89b-12d3-a456-426614174000\n\n...",
  "success": true,
  "timestamp": "2025-01-21T10:30:00.000Z",
  "usecase_id": "123e4567-e89b-12d3-a456-426614174000",
  "usecase_name": "Mon Système IA",
  "saved_to_db": true
}
```

### 2. GET `/api/generate-report`
**Récupère un rapport existant**

#### Requête
```bash
curl -X GET "http://localhost:3000/api/generate-report?usecase_id=123e4567-e89b-12d3-a456-426614174000"
```

#### Réponse
```json
{
  "report": "**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**\n\n...",
  "generated_at": "2025-01-21T10:30:00.000Z",
  "usecase_id": "123e4567-e89b-12d3-a456-426614174000",
  "usecase_name": "Mon Système IA",
  "has_report": true
}
```

### 3. PUT `/api/usecases/[id]/regenerate-report`
**Régénère un rapport existant**

#### Requête
```bash
curl -X PUT http://localhost:3000/api/usecases/123e4567-e89b-12d3-a456-426614174000/regenerate-report \
  -H "Content-Type: application/json"
```

#### Réponse
```json
{
  "report": "**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**\n\n...",
  "success": true,
  "timestamp": "2025-01-21T10:35:00.000Z",
  "usecase_id": "123e4567-e89b-12d3-a456-426614174000",
  "usecase_name": "Mon Système IA",
  "regenerated": true
}
```

## 🔧 Scripts de Test

### Test Complet
```bash
node scripts/test-report-api.js 123e4567-e89b-12d3-a456-426614174000
```

### Test de Régénération
```bash
node scripts/test-regenerate-endpoint.js 123e4567-e89b-12d3-a456-426614174000
```

## 📊 Codes de Statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 400 | Données manquantes ou invalides |
| 404 | Use case ou rapport non trouvé |
| 500 | Erreur serveur |

## 🗄️ Stockage en Base de Données

Les rapports sont automatiquement sauvegardés dans la table `usecases` avec les champs :
- `report_summary` : Contenu du rapport (TEXT)
- `report_generated_at` : Date de génération (TIMESTAMPTZ)

## ⚡ Performance

- **Cache automatique** : Les rapports existants sont récupérés instantanément
- **Régénération à la demande** : Possibilité de forcer la régénération
- **Validation des données** : Vérification avant génération

## 🔒 Sécurité

- Validation des données d'entrée
- Gestion d'erreurs complète
- Logs détaillés pour le debugging

## 📝 Notes d'Utilisation

1. **Première génération** : Utiliser POST `/api/generate-report`
2. **Récupération** : Utiliser GET `/api/generate-report`
3. **Mise à jour** : Utiliser PUT `/api/usecases/[id]/regenerate-report`
4. **Performance** : Préférer GET pour les rapports existants

## 🚨 Gestion des Erreurs

### Erreurs Communes

#### `usecase_id is required`
- **Cause** : Paramètre manquant
- **Solution** : Fournir un ID de use case valide

#### `Usecase not found`
- **Cause** : Use case inexistant
- **Solution** : Vérifier l'ID du use case

#### `No questionnaire responses found`
- **Cause** : Pas de réponses au questionnaire
- **Solution** : Compléter le questionnaire d'abord

#### `Invalid data for analysis`
- **Cause** : Données incomplètes pour l'analyse
- **Solution** : Vérifier les réponses E4.N7.Q2 et E5.N9.Q7

## 🔄 Workflow Recommandé

1. **Créer un use case** dans l'interface
2. **Compléter le questionnaire** (questions E4.N7.Q2 et E5.N9.Q7)
3. **Générer le rapport** avec POST
4. **Récupérer le rapport** avec GET
5. **Régénérer si nécessaire** avec PUT

