// Configuration des règles de scoring basées sur le tableau exact fourni
// Chaque règle correspond exactement aux impacts spécifiés

export const QUESTION_SCORING_CONFIG = {
  // Questions générales avec pattern OUI=0, NON=-5
  'general_compliance': {
    'OUI': 0,
    'NON': -5
  },
  
  // Types de données spécifiques
  'data_types': {
    'Publiques': 0,
    'Personnelles': -5,
    'Stratégiques': -5,
    'Sensibles': -5
  }
}

// Mapping exact des codes de questions aux règles spécifiques selon le tableau
export const QUESTION_CODE_MAPPING = {
  // E6.N10.Q2 - Génération/manipulation de contenu
  'E6.N10.Q2': {
    'E6.N10.Q2.A': 0,   // OUI
    'E6.N10.Q2.B': -5   // NON
  },
  
  // E6.N10.Q1 - Questions générales
  'E6.N10.Q1': 'general_compliance',
  
  // E5.N9.Q9 - Vérification exactitude/cybersécurité
  'E5.N9.Q9': 'general_compliance',
  
  // E5.N9.Q8 - Surveillance humaine  
  'E5.N9.Q8': 'general_compliance',
  
  // E5.N9.Q7 - Registre centralisé
  'E5.N9.Q7': 'general_compliance',
  
  // E5.N9.Q6 - Procédures vérification qualité
  'E5.N9.Q6': 'general_compliance',
  
  // E5.N9.Q5 - Types de données
  'E5.N9.Q5': 'data_types',
  
  // E5.N9.Q4 - Documentation technique
  'E5.N9.Q4': 'general_compliance',
  
  // E5.N9.Q3 - Mesures d'atténuation
  'E5.N9.Q3': 'general_compliance',
  
  // E5.N8.Q2 - Identification risques
  'E5.N8.Q2': 'general_compliance',
  
  // E5.N8.Q1 - Gestion des risques
  'E5.N8.Q1': 'general_compliance',
  
  // E4.N8.Q12 - Jeux vidéos/anti-spam (CAS SPÉCIAL - BONUS!)
  'E4.N8.Q12': {
    'E4.N8.Q12.A': 10,  // OUI = +10 points (bonus)
    'E4.N8.Q12.B': 0    // NON = 0 points
  },
  
  // E4.N8.Q11 - Génération de contenu (INVERSÉ)
  'E4.N8.Q11': {
    'E4.N8.Q11.A': -5,  // OUI = -5 points
    'E4.N8.Q11.B': 0    // NON = 0 points
  },
  
  // E4.N8.Q10 - Usage par nombre de personnes
  'E4.N8.Q10': {
    'E4.N8.Q10.A': 0,   // < 100 = 0 points
    'E4.N8.Q10.B': -5,  // > 100 = -5 points
    'E4.N8.Q10.C': -5,  // > 1000 = -5 points
    'E4.N8.Q10.D': -5,  // > 10k = -5 points
    'E4.N8.Q10.E': -5,  // > 100k = -5 points
    'E4.N8.Q10.F': -5,  // > 1M = -5 points
    'E4.N8.Q10.G': -5   // Other = -5 points
  },
  
  // E4.N8.Q9 - Interaction avec personnes (INVERSÉ)
  'E4.N8.Q9': {
    'E4.N8.Q9.A': -5,   // OUI = -5 points
    'E4.N8.Q9.B': 0     // NON = 0 points
  },
  
  // Questions E4.N8.Q8 à E4.N8.Q3 - Pattern général inversé (OUI = -5, NON = 0)
  'E4.N8.Q8': {
    'E4.N8.Q8.A': -5,   // OUI = -5 points
    'E4.N8.Q8.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q7': {
    'E4.N8.Q7.A': -5,   // OUI = -5 points
    'E4.N8.Q7.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q6': {
    'E4.N8.Q6.A': -5,   // OUI = -5 points
    'E4.N8.Q6.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q5': {
    'E4.N8.Q5.A': -5,   // OUI = -5 points
    'E4.N8.Q5.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q4': {
    'E4.N8.Q4.A': -5,   // OUI = -5 points
    'E4.N8.Q4.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q3': {
    'E4.N8.Q3.A': -5,   // OUI = -5 points
    'E4.N8.Q3.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q2': {
    'E4.N8.Q2.A': -5,   // OUI = -5 points
    'E4.N8.Q2.B': 0     // NON = 0 points
  },
  
  'E4.N8.Q1': {
    'E4.N8.Q1.A': -5,   // OUI = -5 points
    'E4.N8.Q1.B': 0     // NON = 0 points
  },
  
  // E4.N7.Q3 - Activités spécifiques (Prohibited = -50, Others = 0)
  'E4.N7.Q3': {
    'E4.N7.Q3.A': -50,    // Identification biométrique = 0 (Others)
    'E4.N7.Q3.B': -50,    // Catégorisation sensible = 0 (Others)
    'E4.N7.Q3.C': -50,    // Déduction émotions = 0 (Others)
    'E4.N7.Q3.D': -50,    // Reconnaissance faciale = 0 (Others)
    'E4.N7.Q3.E': -50,    // Profilage criminel = 0 (Others)
    'E4.N7.Q3.F': -50,    // Exploitation vulnérabilités = 0 (Others)
    'E4.N7.Q3.G': -50,    // Manipulation = 0 (Others)
    'E4.N7.Q3.H': -50,  // Notation sociale = -50 (Prohibited)
    'E4.N7.Q3.I': 0     // Aucune = 0 (Others)
  },
  
  // E4.N7.Q2 - Domaines d'application (High = -30, Others = 0)
  'E4.N7.Q2': {
    'E4.N7.Q2.A': -30,  // Identification Biométrique = -30 (High)
    'E4.N7.Q2.B': -30,    // Emploi = 0 (Others)
    'E4.N7.Q2.C': -30,    // Infrastructures critiques = 0 (Others)
    'E4.N7.Q2.D': -30,    // Services essentiels = 0 (Others)
    'E4.N7.Q2.E': -30,    // Migration/frontières = 0 (Others)
    'E4.N7.Q2.F': -30,    // Justice = 0 (Others)
    'E4.N7.Q2.G': -30,    // Éducation = 0 (Others)
    'E4.N7.Q2.H': -30,    // Répressif = 0 (Others)
    'E4.N7.Q2.I': 0     // Aucun = 0 (Others)
  }
}

// Fonction utilitaire pour obtenir l'impact d'une réponse
export const getAnswerImpact = (questionCode: string, answerCode: string): number => {
  const mapping = QUESTION_CODE_MAPPING[questionCode as keyof typeof QUESTION_CODE_MAPPING]
  
  if (!mapping) return 0
  
  if (typeof mapping === 'string') {
    // Référence à une règle générale
    const rule = QUESTION_SCORING_CONFIG[mapping as keyof typeof QUESTION_SCORING_CONFIG]
    if (!rule) return 0
    
    // Pour les types de données
    if (mapping === 'data_types') {
      return (rule as any)[answerCode] || 0
    }
    
    // Pour les règles générales (OUI/NON)
    if (mapping === 'general_compliance') {
      // Déterminer si c'est OUI ou NON basé sur le code de réponse
      if (answerCode.includes('.A')) {
        return (rule as any).OUI || 0
      } else if (answerCode.includes('.B')) {
        return (rule as any).NON || 0
      }
    }
    
    return 0
  } else {
    // Règles spécifiques par code
    return (mapping as any)[answerCode] || 0
  }
} 