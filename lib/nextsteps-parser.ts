import { UseCaseNextStepsInput } from './supabase'

/**
 * Fonction principale qui détecte automatiquement le format du rapport
 * et extrait les données structurées
 */
export function extractNextStepsFromReport(reportText: string): Partial<UseCaseNextStepsInput> {
  // Détecter le format du rapport
  if (reportText.includes('## Introduction contextuelle') || reportText.includes('### Les 3 priorités')) {
    // Format Markdown structuré
    return extractNextStepsFromMarkdown(reportText)
  } else if (reportText.includes('"introduction"') || reportText.includes('"priorite_1"')) {
    // Format JSON
    return extractNextStepsFromJSON(reportText)
  } else {
    // Format inconnu, essayer l'extraction Markdown par défaut
    console.warn('⚠️ Format de rapport non reconnu, tentative d\'extraction Markdown')
    return extractNextStepsFromMarkdown(reportText)
  }
}

/**
 * Extrait les données depuis un rapport au format JSON
 */
export function extractNextStepsFromJSON(reportText: string): Partial<UseCaseNextStepsInput> {
  try {
    // Essayer de parser le JSON
    const jsonData = JSON.parse(reportText)
    
    // Extraire les champs pertinents
    const result: Partial<UseCaseNextStepsInput> = {}
    
    if (jsonData.introduction) result.introduction = jsonData.introduction
    if (jsonData.evaluation) result.evaluation = jsonData.evaluation
    if (jsonData.impact) result.impact = jsonData.impact
    if (jsonData.conclusion) result.conclusion = jsonData.conclusion
    
    if (jsonData.priorite_1) result.priorite_1 = jsonData.priorite_1
    if (jsonData.priorite_2) result.priorite_2 = jsonData.priorite_2
    if (jsonData.priorite_3) result.priorite_3 = jsonData.priorite_3
    
    if (jsonData.quick_win_1) result.quick_win_1 = jsonData.quick_win_1
    if (jsonData.quick_win_2) result.quick_win_2 = jsonData.quick_win_2
    if (jsonData.quick_win_3) result.quick_win_3 = jsonData.quick_win_3
    
    if (jsonData.action_1) result.action_1 = jsonData.action_1
    if (jsonData.action_2) result.action_2 = jsonData.action_2
    if (jsonData.action_3) result.action_3 = jsonData.action_3
    
    return result
  } catch (error) {
    console.error('❌ Erreur parsing JSON:', error)
    return {}
  }
}

/**
 * Extrait les sections structurées d'un rapport Markdown OpenAI
 * et les transforme en format UseCaseNextStepsInput
 */
export function extractNextStepsFromMarkdown(reportText: string): Partial<UseCaseNextStepsInput> {
  const result: Partial<UseCaseNextStepsInput> = {}
  
  // Extraire l'introduction contextuelle
  const introductionMatch = reportText.match(/## Introduction contextuelle\s*\n([\s\S]*?)(?=##|$)/)
  if (introductionMatch) {
    result.introduction = introductionMatch[1].trim()
  }
  
  // Extraire l'évaluation du niveau de risque
  const evaluationMatch = reportText.match(/## Évaluation du niveau de risque AI Act\s*\n([\s\S]*?)(?=##|$)/)
  if (evaluationMatch) {
    result.evaluation = evaluationMatch[1].trim()
  }
  
  // Extraire l'impact attendu
  const impactMatch = reportText.match(/## Impact attendu\s*\n([\s\S]*?)(?=##|$)/)
  if (impactMatch) {
    result.impact = impactMatch[1].trim()
  }
  
  // Extraire la conclusion
  const conclusionMatch = reportText.match(/## Conclusion\s*\n([\s\S]*?)(?=##|$)/)
  if (conclusionMatch) {
    result.conclusion = conclusionMatch[1].trim()
  }
  
  // Extraire les 3 priorités d'actions réglementaires
  const prioritiesMatch = reportText.match(/### Les 3 priorités d'actions réglementaires\s*\n([\s\S]*?)(?=###|##|$)/)
  if (prioritiesMatch) {
    const prioritiesSection = prioritiesMatch[1]
    // Chercher les patterns avec ou sans numérotation : **1. texte.** ou **texte.**
    const priorityMatches = prioritiesSection.match(/\*\*(\d+\.\s*)?([^*]+)\*\*/g)
    
    if (priorityMatches && priorityMatches.length >= 3) {
      result.priorite_1 = priorityMatches[0].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
      result.priorite_2 = priorityMatches[1].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
      result.priorite_3 = priorityMatches[2].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
    }
  }
  
  // Extraire les quick wins & actions immédiates
  const quickWinsMatch = reportText.match(/### Quick wins & actions immédiates recommandées\s*\n([\s\S]*?)(?=###|##|$)/)
  if (quickWinsMatch) {
    const quickWinsSection = quickWinsMatch[1]
    // Chercher les patterns avec ou sans numérotation : **1. texte.** ou **texte.**
    const quickWinMatches = quickWinsSection.match(/\*\*(\d+\.\s*)?([^*]+)\*\*/g)
    
    if (quickWinMatches && quickWinMatches.length >= 3) {
      result.quick_win_1 = quickWinMatches[0].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
      result.quick_win_2 = quickWinMatches[1].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
      result.quick_win_3 = quickWinMatches[2].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim()
    }
  }
  
  // Extraire les actions à moyen terme
  const actionsMatch = reportText.match(/### Actions à moyen terme\s*\n([\s\S]*?)(?=###|##|$)/)
  if (actionsMatch) {
    const actionsSection = actionsMatch[1]
    // Chercher le contenu des actions au format **Titre** description complète...
    const actionMatches = actionsSection.match(/\*\*([^*]+)\*\*\s*([^\n]+)/g)
    
    if (actionMatches && actionMatches.length >= 3) {
      // Extraire toute la phrase en supprimant seulement les ** du titre
      result.action_1 = actionMatches[0].replace(/\*\*([^*]+)\*\*\s*/, '$1 ').trim()
      result.action_2 = actionMatches[1].replace(/\*\*([^*]+)\*\*\s*/, '$1 ').trim()
      result.action_3 = actionMatches[2].replace(/\*\*([^*]+)\*\*\s*/, '$1 ').trim()
    }
  }
  
  return result
}

/**
 * Valide qu'un objet UseCaseNextStepsInput contient les données essentielles
 */
export function validateNextStepsData(data: Partial<UseCaseNextStepsInput>): {
  isValid: boolean
  missingFields: string[]
  warnings: string[]
} {
  const missingFields: string[] = []
  const warnings: string[] = []
  
  // Vérifier les champs obligatoires
  if (!data.usecase_id) {
    missingFields.push('usecase_id')
  }
  
  // Vérifier les sections principales
  if (!data.introduction) {
    warnings.push('Introduction manquante')
  }
  
  if (!data.evaluation) {
    warnings.push('Évaluation du niveau de risque manquante')
  }
  
  if (!data.impact) {
    warnings.push('Impact attendu manquant')
  }
  
  if (!data.conclusion) {
    warnings.push('Conclusion manquante')
  }
  
  // Vérifier les priorités
  const prioritiesCount = [data.priorite_1, data.priorite_2, data.priorite_3].filter(Boolean).length
  if (prioritiesCount < 3) {
    warnings.push(`Seulement ${prioritiesCount}/3 priorités trouvées`)
  }
  
  // Vérifier les quick wins
  const quickWinsCount = [data.quick_win_1, data.quick_win_2, data.quick_win_3].filter(Boolean).length
  if (quickWinsCount < 3) {
    warnings.push(`Seulement ${quickWinsCount}/3 quick wins trouvés`)
  }
  
  // Vérifier les actions à moyen terme
  const actionsCount = [data.action_1, data.action_2, data.action_3].filter(Boolean).length
  if (actionsCount < 3) {
    warnings.push(`Seulement ${actionsCount}/3 actions à moyen terme trouvées`)
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Nettoie et formate le texte extrait
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Nettoyer les retours à la ligne multiples
    .replace(/^\s+|\s+$/g, '') // Supprimer les espaces en début/fin
    .replace(/\*\*/g, '') // Supprimer les ** restants
    .trim()
}

/**
 * Log les résultats de l'extraction pour le debug
 */
export function logExtractionResults(
  reportText: string, 
  extractedData: Partial<UseCaseNextStepsInput>,
  validation: { isValid: boolean; missingFields: string[]; warnings: string[] }
): void {
  console.log('🔍 === RÉSULTATS D\'EXTRACTION ===')
  console.log('📄 Longueur du rapport:', reportText.length, 'caractères')
  console.log('📊 Données extraites:', Object.keys(extractedData).length, 'champs')
  console.log('✅ Validation:', validation.isValid ? 'OK' : 'ERREUR')
  
  if (validation.missingFields.length > 0) {
    console.log('❌ Champs manquants:', validation.missingFields)
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️ Avertissements:', validation.warnings)
  }
  
  // Log des sections extraites
  console.log('📋 Sections extraites:')
  if (extractedData.introduction) console.log('  - Introduction:', extractedData.introduction.substring(0, 100) + '...')
  if (extractedData.evaluation) console.log('  - Évaluation:', extractedData.evaluation.substring(0, 100) + '...')
  if (extractedData.impact) console.log('  - Impact:', extractedData.impact.substring(0, 100) + '...')
  if (extractedData.conclusion) console.log('  - Conclusion:', extractedData.conclusion.substring(0, 100) + '...')
  
  // Log des priorités
  console.log('🎯 Priorités:')
  if (extractedData.priorite_1) console.log('  1.', extractedData.priorite_1)
  if (extractedData.priorite_2) console.log('  2.', extractedData.priorite_2)
  if (extractedData.priorite_3) console.log('  3.', extractedData.priorite_3)
  
  console.log('🔍 === FIN RÉSULTATS ===')
}

/**
 * Interface pour les étapes extraites (format simple)
 */
export interface NextStep {
  title: string;
  description: string;
  priority: 'haute' | 'moyenne' | 'faible' | 'non-spécifiée';
  deadline?: string;
}

/**
 * Parse les prochaines étapes depuis un texte de réponse OpenAI
 * Version simplifiée pour l'extraction d'étapes structurées
 */
export function parseNextSteps(responseText: string): NextStep[] {
  const steps: NextStep[] = [];
  const seenTitles = new Set<string>();
  
  // Patterns pour détecter les étapes (ordre de priorité)
  const stepPatterns = [
    // Format: 1. **Titre** (Priorité : X) - Description
    /(\d+)\.\s*\*\*([^*]+)\*\*\s*\([^)]*[Pp]riorit[ée]\s*:\s*([^)]+)\)[^-\n]*-?\s*([^\n]+)/g,
    // Format: 1. **Titre** - Description (Échéance : X)
    /(\d+)\.\s*\*\*([^*]+)\*\*\s*-?\s*([^(\n]+?)(?:\s*\([^)]*[Éé]chéance\s*:\s*([^)]+)\))?/g,
    // Format avec tirets: - **Titre** (Priorité : X)
    /-\s*\*\*([^*]+)\*\*\s*\([^)]*[Pp]riorit[ée]\s*:\s*([^)]+)\)[^-\n]*-?\s*([^\n]+)/g,
    // Format simple: 1. Titre - Description
    /(\d+)\.\s*([^-\n]+?)\s*-\s*([^\n]+)/g,
    // Format simple avec tirets: - Titre
    /-\s*([^-\n]+?)(?:\s*\([^)]*[Éé]chéance\s*:\s*([^)]+)\))?/g
  ];
  
  for (const pattern of stepPatterns) {
    let match;
    while ((match = pattern.exec(responseText)) !== null) {
      let title = '';
      let description = '';
      let priority: 'haute' | 'moyenne' | 'faible' | 'non-spécifiée' = 'non-spécifiée';
      let deadline: string | undefined;
      
      if (match.length >= 4) {
        // Format avec priorité
        title = match[2] || match[1];
        description = match[4] || match[3];
        
        // Détecter la priorité dans le match complet
        const fullMatch = match[0].toLowerCase();
        if (fullMatch.includes('haute') || fullMatch.includes('critique') || fullMatch.includes('urgent')) {
          priority = 'haute';
        } else if (fullMatch.includes('moyenne') || fullMatch.includes('important')) {
          priority = 'moyenne';
        } else if (fullMatch.includes('faible') || fullMatch.includes('basse')) {
          priority = 'faible';
        }
        
        // Détecter l'échéance
        const deadlineMatch = match[0].match(/(\d+)\s*(semaines?|mois|jours?|semaine)/i);
        if (deadlineMatch) {
          deadline = `${deadlineMatch[1]} ${deadlineMatch[2]}`;
        }
      }
      
      if (title && description) {
        const cleanTitle = title.trim();
        // Éviter les doublons
        if (!seenTitles.has(cleanTitle)) {
          seenTitles.add(cleanTitle);
          steps.push({
            title: cleanTitle,
            description: description.trim(),
            priority,
            deadline
          });
        }
      }
    }
  }
  
  // Si aucun pattern n'a fonctionné, essayer une extraction basique
  if (steps.length === 0) {
    const basicSteps = extractNextSteps(responseText);
    return basicSteps;
  }
  
  return steps;
}

/**
 * Extraction basique des étapes (fallback)
 */
export function extractNextSteps(text: string): NextStep[] {
  const steps: NextStep[] = [];
  
  // Chercher des listes numérotées ou à puces
  const lines = text.split('\n');
  let currentStep: Partial<NextStep> = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Détecter le début d'une étape
    if (/^\d+\./.test(trimmedLine) || /^-/.test(trimmedLine)) {
      // Sauvegarder l'étape précédente si elle existe
      if (currentStep.title && currentStep.description) {
        steps.push({
          title: currentStep.title,
          description: currentStep.description,
          priority: currentStep.priority || 'non-spécifiée',
          deadline: currentStep.deadline
        });
      }
      
      // Commencer une nouvelle étape
      const stepText = trimmedLine.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '');
      currentStep = {
        title: stepText,
        description: '',
        priority: 'non-spécifiée'
      };
      
      // Détecter la priorité dans le titre
      const titleLower = stepText.toLowerCase();
      if (titleLower.includes('haute') || titleLower.includes('critique') || titleLower.includes('urgent')) {
        currentStep.priority = 'haute';
      } else if (titleLower.includes('moyenne') || titleLower.includes('important')) {
        currentStep.priority = 'moyenne';
      } else if (titleLower.includes('faible') || titleLower.includes('basse')) {
        currentStep.priority = 'faible';
      }
      
    } else if (currentStep.title && trimmedLine && !trimmedLine.startsWith('##')) {
      // Continuer la description
      currentStep.description += (currentStep.description ? ' ' : '') + trimmedLine;
    }
  }
  
  // Ajouter la dernière étape
  if (currentStep.title && currentStep.description) {
    steps.push({
      title: currentStep.title,
      description: currentStep.description,
      priority: currentStep.priority || 'non-spécifiée',
      deadline: currentStep.deadline
    });
  }
  
  return steps;
}
