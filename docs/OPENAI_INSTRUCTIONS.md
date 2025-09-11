# Consignes pour l'Assistant OpenAI

## 🎯 Objectif

L'Assistant OpenAI doit générer des rapports de conformité AI Act en utilisant **exactement** la structure Markdown spécifiée ci-dessous. Cette structure garantit un formatage cohérent et professionnel dans l'interface utilisateur.

## 📋 Structure Obligatoire

### Template de Rapport
```markdown
# Recommandations et plan d'action

## Introduction contextuelle
[Texte narratif décrivant le contexte de l'entreprise et du système IA]

## Évaluation du niveau de risque AI Act
[Texte narratif évaluant le niveau de risque spécifique]

## Il est impératif de mettre en œuvre les mesures suivantes :
### Les 3 priorités d'actions réglementaires

**Phrase 1.** Suite du texte.
**Phrase 2.** Suite du texte.
**Phrase 3.** Suite du texte.

## Trois actions concrètes à mettre en œuvre rapidement :
### Quick wins & actions immédiates recommandées

**Phrase 1.** Suite du texte.
**Phrase 2.** Suite du texte.
**Phrase 3.** Suite du texte.

## Impact attendu
[Texte narratif]

## Trois actions structurantes à mener dans les 3 à 6 mois :
### Actions à moyen terme

**Sous-titre 1 :** [Texte narratif]
**Sous-titre 2 :** [Texte narratif]
**Sous-titre 3 :** [Texte narratif]

## Conclusion

[Texte narratif]
```

## 🔧 Règles de Formatage Strictes

### 1. Syntaxe Markdown Obligatoire
- **Titre principal** : `# Titre` (gras, grande taille)
- **Sections principales** : `## Titre` (gras, taille moyenne)
- **Sous-sections** : `### Titre` (italique, taille moyenne)
- **Texte en gras** : `**texte**` (gras, taille normale)

### 2. Structure Hiérarchique
1. **# Recommandations et plan d'action** (Titre principal)
2. **## Introduction contextuelle** (Section principale)
3. **## Évaluation du niveau de risque AI Act** (Section principale)
4. **## Il est impératif de mettre en œuvre les mesures suivantes :** (Section principale)
   - **### Les 3 priorités d'actions réglementaires** (Sous-section)
5. **## Trois actions concrètes à mettre en œuvre rapidement :** (Section principale)
   - **### Quick wins & actions immédiates recommandées** (Sous-section)
6. **## Impact attendu** (Section principale)
7. **## Trois actions structurantes à mener dans les 3 à 6 mois :** (Section principale)
   - **### Actions à moyen terme** (Sous-section)
8. **## Conclusion** (Section principale)

### 3. Règles de Contenu
- **Titres** : Ne jamais modifier les titres ou sous-titres
- **Phrases d'action** : Toujours commencer par `**Phrase X.**` (gras)
- **Contenu** : Adapter selon l'entreprise et le système IA analysé
- **Professionnalisme** : Utiliser un langage précis et actionnable

## 📝 Instructions pour l'Assistant

### Prompt à Inclure
```
**INSTRUCTIONS DE FORMATAGE OBLIGATOIRES :**

Tu dois suivre EXACTEMENT cette structure Markdown, sans modification :

1. **Titre principal** : "# Recommandations et plan d'action"

2. **Introduction contextuelle** : "## Introduction contextuelle"
   - Texte narratif décrivant le contexte de l'entreprise et du système IA

3. **Évaluation du niveau de risque AI Act** : "## Évaluation du niveau de risque AI Act"
   - Texte narratif évaluant le niveau de risque spécifique

4. **Il est impératif de mettre en œuvre les mesures suivantes :** : "## Il est impératif de mettre en œuvre les mesures suivantes :"
   - **Les 3 priorités d'actions réglementaires** : "### Les 3 priorités d'actions réglementaires"
   - **Phrase 1.** Suite du texte.
   - **Phrase 2.** Suite du texte.
   - **Phrase 3.** Suite du texte.

5. **Trois actions concrètes à mettre en œuvre rapidement :** : "## Trois actions concrètes à mettre en œuvre rapidement :"
   - **Quick wins & actions immédiates recommandées** : "### Quick wins & actions immédiates recommandées"
   - **Phrase 1.** Suite du texte.
   - **Phrase 2.** Suite du texte.
   - **Phrase 3.** Suite du texte.

6. **Impact attendu** : "## Impact attendu"
   - [Texte narratif]

7. **Trois actions structurantes à mener dans les 3 à 6 mois :** : "## Trois actions structurantes à mener dans les 3 à 6 mois :"
   - **Actions à moyen terme** : "### Actions à moyen terme"
   - **Sous-titre 1 :** [Texte narratif]
   - **Sous-titre 2 :** [Texte narratif]
   - **Sous-titre 3 :** [Texte narratif]

8. **Conclusion** : "## Conclusion"
   - [Texte narratif]

**RÈGLES STRICTES :**
- Utilise EXACTEMENT la syntaxe Markdown fournie
- Respecte EXACTEMENT cette structure
- Ne modifie pas les titres ou sous-titres
- Utilise des phrases complètes et professionnelles
- Adapte le contenu selon l'entreprise et le système IA analysé
- Utilise **texte en gras** pour les phrases d'action importantes
- Utilise # pour les titres principaux, ## pour les sections, ### pour les sous-sections
```

## ✅ Vérifications

### Avant Génération
- [ ] Le prompt contient les instructions de formatage
- [ ] La structure Markdown est respectée
- [ ] Les titres ne sont pas modifiés
- [ ] Le contenu est adapté au contexte

### Après Génération
- [ ] Le rapport commence par `# Recommandations et plan d'action`
- [ ] Toutes les sections principales sont présentes
- [ ] Les sous-sections utilisent `###`
- [ ] Le texte en gras utilise `**texte**`
- [ ] La structure est cohérente

## 🎯 Résultat Attendu

L'Assistant OpenAI génère un rapport qui, une fois affiché dans l'interface, présente :

1. **Titre principal** : Gras, grande taille (2xl)
2. **Sections principales** : Gras, taille moyenne (xl)
3. **Sous-sections** : Italique, taille moyenne (lg)
4. **Phrases d'action** : Gras, taille normale
5. **Hiérarchie visuelle** : Claire et professionnelle

## 🔄 Maintenance

### Mise à Jour du Template
Si la structure doit être modifiée :
1. Modifier `lib/formatting-template.ts`
2. Mettre à jour les instructions dans les clients OpenAI
3. Tester avec `scripts/test-markdown-formatting.js`
4. Valider le rendu dans l'interface

### Dépannage
- **Markdown non interprété** : Vérifier la fonction `formatReport`
- **Structure incorrecte** : Vérifier les instructions de l'Assistant
- **Formatage manquant** : Vérifier la syntaxe Markdown

