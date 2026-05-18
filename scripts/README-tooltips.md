# Mise à jour massive des infobulles

Ce script permet de mettre à jour massivement les infobulles (tooltips) des questions et réponses du questionnaire.

## Format de soumission

Le format attendu est le suivant :

```
Question: [texte de la question ou de la réponse]
Catégorie: [Question | Réponse]
Texte: [contenu infobulle pour questions]
Réponse: [contenu infobulle pour réponses]
```

### Exemple

```
Question: Robotique
Catégorie: Réponse
Réponse: La Robotique regroupe les systèmes physiques (robots, machines) qui utilisent l'IA pour fonctionner avec autonomie, interagir avec leur environnement et exécuter des tâches.

Question: Systèmes experts
Catégorie: Réponse
Réponse: Les Systèmes experts sont des systèmes informatiques (souvent qualifiés d'approches fondées sur la logique et les connaissances) qui simulent le processus de prise de décision d'un expert humain.
```

## Utilisation

### Depuis le chat

Utilisez la fonction `updateTooltipsFromUserInput()` avec le texte formaté :

```typescript
import { updateTooltipsFromUserInput } from './scripts/update-tooltips-chat'

const result = updateTooltipsFromUserInput(inputText)
```

### Depuis la ligne de commande

```bash
npx ts-node scripts/update-tooltips.ts "<input text>"
```

## Fonctionnalités

- ✅ Parse le format de soumission utilisateur
- ✅ Trouve les correspondances par texte exact ou partiel
- ✅ Met à jour ou crée les tooltips en préservant les propriétés existantes
- ✅ Valide la longueur (max 300 caractères)
- ✅ Gère les correspondances ambiguës
- ✅ Signale les entrées non trouvées
- ✅ Met à jour les deux fichiers JSON (questions-with-scores.json et creation-questions.json)

## Fichiers modifiés

- `app/usecases/[id]/data/questions-with-scores.json`
- `app/usecases/new/creation-questions.json`

## Structure des tooltips

### Dans questions-with-scores.json
- Questions : `tooltip: { title, shortContent, icon }`
- Réponses : `tooltip: { title, shortContent, icon }`

### Dans creation-questions.json
- Questions : `tooltip: { title, shortContent, fullContent?, icon }`
- Réponses : `tooltip: { title, shortContent, fullContent?, icon }`

## Notes importantes

- Les tooltips existants sont mis à jour, les propriétés non modifiées (title, icon) sont préservées
- Si un tooltip n'existe pas, il est créé avec les valeurs par défaut
- La longueur du contenu est limitée à 300 caractères selon la charte
- Les correspondances sont recherchées de manière insensible à la casse
- En cas de correspondances multiples, la première est utilisée

