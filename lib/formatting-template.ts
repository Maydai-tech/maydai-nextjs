/**
 * Template de formatage standardisé pour les rapports de conformité AI Act
 * Structure fixe permettant à Cursor de gérer automatiquement la mise en page
 */

export const COMPLIANCE_REPORT_TEMPLATE = `
# Recommandations et plan d'action

## Introduction contextuelle
[Texte narratif]

## Évaluation du niveau de risque AI Act
[Texte narratif]

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
`

/**
 * Instructions de formatage pour l'Assistant OpenAI
 * Spécifie exactement comment structurer la réponse
 */
export const FORMATTING_INSTRUCTIONS = `
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
`

/**
 * Template de prompt pour l'Assistant OpenAI
 * Intègre la structure de formatage standardisée
 */
export function buildStandardizedPrompt(
  companyName: string,
  usecaseName: string,
  usecaseId: string,
  companyIndustry?: string,
  companyCity?: string,
  companyCountry?: string,
  questionnaireData?: string
): string {
  return `
**ANALYSE DE CONFORMITÉ IA ACT - SECTION 3**

**Informations de l'entreprise :**
- Nom de l'entreprise : ${companyName}
- Secteur d'activité : ${companyIndustry || 'Non spécifié'}
- Localisation : ${companyCity || 'Non spécifié'}, ${companyCountry || 'Non spécifié'}

**Informations du système d'IA :**
- Nom du système : ${usecaseName}
- ID : ${usecaseId}

**IMPORTANT :** 
- L'entreprise s'appelle "${companyName}"
- Le système d'IA s'appelle "${usecaseName}"
- Dans ton analyse, utilise toujours "${companyName}" comme nom de l'entreprise

**DONNÉES DU QUESTIONNAIRE :**
${questionnaireData || 'Aucune donnée de questionnaire disponible'}

${FORMATTING_INSTRUCTIONS}

Sois précis, professionnel et actionnable dans tes recommandations.
**RAPPEL :** Utilise "${companyName}" comme nom de l'entreprise et "${usecaseName}" comme nom du système d'IA.
  `.trim()
}
