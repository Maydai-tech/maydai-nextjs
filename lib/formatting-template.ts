/**
 * Template et instructions de formatage pour les rapports de conformité AI Act.
 *
 * Le format cible est un JSON strict avec les 9 clés d'action directes.
 * Le template Markdown legacy est conservé pour référence / affichage.
 */

/**
 * Template Markdown legacy — conservé pour le rendu visuel des anciens rapports.
 */
export const COMPLIANCE_REPORT_TEMPLATE = `
# Recommandations et plan d'action

## Introduction contextuelle
[Texte narratif]

## Évaluation du niveau de risque AI Act
[Texte narratif]

## Mesures importantes de conformité à renseigner :
### Actions réglementaires et documents techniques

**Phrase 1.** Suite du texte.
**Phrase 2.** Suite du texte.
**Phrase 3.** Suite du texte.

## Actions rapides et concrètes à mettre en œuvre :
### Actions immédiates recommandées

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
 * Instructions JSON strictes pour les nouvelles générations de rapports.
 * Utilisé dans buildCompleteAnalysisPrompt (openai-client.ts).
 * Conservé ici comme référence — le prompt réel est inline dans openai-client.ts.
 */
export const JSON_SCHEMA_KEYS = [
  'introduction_contextuelle',
  'evaluation_risque',
  'quick_win_1',
  'quick_win_2',
  'quick_win_3',
  'priorite_1',
  'priorite_2',
  'priorite_3',
  'action_1',
  'action_2',
  'action_3',
  'impact_attendu',
  'conclusion',
] as const

/**
 * Instructions de formatage legacy (Markdown).
 * Conservé pour le workflow buildStandardizedPrompt (ancien format).
 */
export const FORMATTING_INSTRUCTIONS = `
**FORMAT DE SORTIE OBLIGATOIRE — JSON STRICT**

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide.
Aucun texte avant ou après le JSON. Aucun bloc Markdown autour.

La structure attendue contient ces clés exactes :
- "introduction_contextuelle" : texte narratif
- "evaluation_risque" : objet { "niveau": "...", "justification": "..." }
- "quick_win_1" : action sur le registre centralisé IA
- "quick_win_2" : action sur la surveillance humaine
- "quick_win_3" : action sur les instructions système / prompts
- "priorite_1" : action sur la documentation technique
- "priorite_2" : action sur le marquage de transparence
- "priorite_3" : action sur la qualité des données
- "action_1" : action sur la gestion des risques
- "action_2" : action sur la surveillance continue
- "action_3" : action sur les formations AI Act
- "impact_attendu" : texte narratif
- "conclusion" : texte narratif

Chaque action doit être un texte UNIQUE, AUTONOME et SPÉCIFIQUE (2 à 4 phrases).
Deux actions ne doivent JAMAIS avoir un contenu similaire.
`

/**
 * Template de prompt legacy pour l'Assistant OpenAI (ancien format simplifié).
 * Utilisé uniquement par generateComplianceAnalysis (ancien workflow).
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
