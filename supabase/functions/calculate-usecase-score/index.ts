import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ===== CONSTANTES =====
// Score de départ pour tous les cas d'usage
const BASE_SCORE = 90;
// Multiplicateur pour convertir le score COMPL-AI (0-1) en score sur 20
const COMPL_AI_MULTIPLIER = 20;
// Poids du score de base dans le calcul final
const BASE_SCORE_WEIGHT = 100;
// Poids du score modèle dans le calcul final
const MODEL_SCORE_WEIGHT = 20;
// Poids total pour le calcul final
const TOTAL_WEIGHT = 120;

// ===== FONCTIONS UTILITAIRES =====

/**
 * Arrondit un nombre à 2 décimales
 * Exemple: 15.666 devient 15.67
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Crée une réponse d'erreur standardisée
 */
function createErrorResponse(message: string, status: number, corsHeaders: any) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// ===== DONNÉES DES QUESTIONS =====
// Note: Dans une vraie application, ces données viendraient de la base de données
const QUESTIONS_DATA = {
  "E4.N7.Q1": {
    "id": "E4.N7.Q1",
    "question": "Dans cette situation, votre cas d'usage concerne :",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q1.A",
        "label": "Mon entreprise travaille dans le domaine de l'informatique et de l'IA",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.B",
        "label": "Mon entreprise utilise des systèmes d'IA tiers",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q1.1": {
    "id": "E4.N7.Q1.1",
    "question": "Quelle phrase décrit le mieux votre situation ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q1.1.A",
        "label": "Je suis fabricant d'un produit intégrant un système d'IA",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.1.B",
        "label": "Je distribue et/ou déploie un système d'IA pour d'autres entreprises",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.1.C",
        "label": "Je suis éditeur d'un logiciel intégrant un système d'IA",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.1.D",
        "label": "Je suis importateur d'un système d'IA",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.1.E",
        "label": "Je suis un fournisseur d'un système d'IA",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.1.F",
        "label": "Je suis représentant autorisé d'un fournisseur de système d'IA",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q1.2": {
    "id": "E4.N7.Q1.2",
    "question": "Quelle phrase décrit le mieux votre situation ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q1.2.A",
        "label": "Je suis un utilisateur d'un système d'IA pour mon entreprise",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.2.B",
        "label": "J'ai une idée de cas d'usage IA et souhaite tester sa conformité",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.2.C",
        "label": "Je suis le Data Protection Officer (DPO) de mon entreprise",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.2.D",
        "label": "Je suis avocat et souhaite apporter des réponses techniques à mes clients",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.2.E",
        "label": "Je suis dirigeant et souhaite recenser tous les cas d'usage IA de mon entreprise",
        "score_impact": 0
      },
      {
        "code": "E4.N7.Q1.2.F",
        "label": "Je suis étudiant ou chercheur souhaitant approfondir le sujet IA Act",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q2": {
    "id": "E4.N7.Q2",
    "question": "Votre système d'IA est utilisé dans un ou des domaines suivants ?",
    "type": "checkbox",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q2.A",
        "label": "Emploi, gestion des travailleurs et accès à l'emploi indépendant",
        "score_impact": -30,
        "category_impacts": {
          "diversity_fairness": -5
        }
      },
      {
        "code": "E4.N7.Q2.B",
        "label": "Administration de la justice et processus démocratiques",
        "score_impact": -30,
        "category_impacts": {
          "diversity_fairness": -5
        }
      },
      {
        "code": "E4.N7.Q2.C",
        "label": "Migration, asile et gestion des contrôles aux frontières",
        "score_impact": -30,
        "category_impacts": {
          "diversity_fairness": -5
        }
      },
      {
        "code": "E4.N7.Q2.D",
        "label": "Gestion et exploitation des infrastructures critiques",
        "score_impact": -30,
        "category_impacts": {
          "technical_robustness": -5
        }
      },
      {
        "code": "E4.N7.Q2.E",
        "label": "Éducation et formation professionnelle",
        "score_impact": -30,
        "category_impacts": {
          "diversity_fairness": -5
        }
      },
      {
        "code": "E4.N7.Q2.F",
        "label": "Activités répressives (risque récidive, fiabilité preuves...)",
        "score_impact": -30,
        "category_impacts": {
          "diversity_fairness": -5
        }
      },
      {
        "code": "E4.N7.Q2.G",
        "label": "Aucun de ces domaines",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q2.1": {
    "id": "E4.N7.Q2.1",
    "question": "Votre système d'IA est utilisé dans un ou plusieurs des cas suivants ?",
    "type": "checkbox",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q2.1.A",
        "label": "Identification Biométrique à Distance en Temps Réel dans les Espaces Publics",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q2.1.B",
        "label": "Composant de sécurité dans des secteurs critiques (santé, transports, énergies, etc.)",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q2.1.C",
        "label": "Évaluations dans un système d'éducation ou en entreprise",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q2.1.D",
        "label": "Accès et jouissance de services essentiels privés et publics",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q2.1.E",
        "label": "Aucun de ces cas",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q3": {
    "id": "E4.N7.Q3",
    "question": "Votre système d'IA a pour finalité une ou des activités suivantes ?",
    "type": "checkbox",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q3.A",
        "label": "Identification biométrique et catégorisation des personnes physiques",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.B",
        "label": "Catégorisation biométrique basée sur des caractéristiques sensibles",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.C",
        "label": "Création de bases de données de reconnaissance faciale par moissonnage non ciblé",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.D",
        "label": "Déduction des émotions sur le lieu de travail et d'enseignement",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.E",
        "label": "Aucune de ces activités",
        "score_impact": 0
      }
    ]
  },
  "E4.N7.Q3.1": {
    "id": "E4.N7.Q3.1",
    "question": "Possible intervention dans l'une de ces situations ?",
    "type": "checkbox",
    "required": true,
    "options": [
      {
        "code": "E4.N7.Q3.1.A",
        "label": "Exploitation des vulnérabilités",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.1.B",
        "label": "Manipulation et tromperie",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.1.C",
        "label": "Notation sociale",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.1.D",
        "label": "Profilage pour évaluation du risque criminel",
        "is_eliminatory": true
      },
      {
        "code": "E4.N7.Q3.1.E",
        "label": "Aucune de ces situations",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q2": {
    "id": "E4.N8.Q2",
    "question": "Question E4.N8.Q2",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q2.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q2.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q3": {
    "id": "E4.N8.Q3",
    "question": "Question E4.N8.Q3",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q3.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q3.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q4": {
    "id": "E4.N8.Q4",
    "question": "Question E4.N8.Q4",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q4.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q4.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q5": {
    "id": "E4.N8.Q5",
    "question": "Question E4.N8.Q5",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q5.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q5.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q6": {
    "id": "E4.N8.Q6",
    "question": "Question E4.N8.Q6",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q6.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q6.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q7": {
    "id": "E4.N8.Q7",
    "question": "Question E4.N8.Q7",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q7.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q7.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q8": {
    "id": "E4.N8.Q8",
    "question": "Question E4.N8.Q8",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q8.A",
        "label": "Oui",
        "score_impact": -5
      },
      {
        "code": "E4.N8.Q8.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q9": {
    "id": "E4.N8.Q9",
    "question": "Votre système d'IA interagit-il avec des personnes physiques ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q9.A",
        "label": "Oui",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      },
      {
        "code": "E4.N8.Q9.B",
        "label": "Non",
        "score_impact": 0
      }
    ]
  },
  "E4.N8.Q10": {
    "id": "E4.N8.Q10",
    "question": "Utilisé par combien de personnes physiques par mois ?",
    "type": "conditional",
    "required": true,
    "conditionalFields": [
      {
        "key": "other_count",
        "label": "Autre nombre",
        "placeholder": "Précisez..."
      }
    ],
    "options": [
      {
        "code": "E4.N8.Q10.A",
        "label": "< de 100",
        "score_impact": 0
      },
      {
        "code": "E4.N8.Q10.B",
        "label": "> à 100",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      },
      {
        "code": "E4.N8.Q10.C",
        "label": "> à 1000",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      },
      {
        "code": "E4.N8.Q10.D",
        "label": "> à 10 000",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      },
      {
        "code": "E4.N8.Q10.E",
        "label": "> à 100 000",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      },
      {
        "code": "E4.N8.Q10.F",
        "label": "> à 1 M",
        "score_impact": -5,
        "category_impacts": {
          "human_oversight": -5
        }
      }
    ]
  },
  "E4.N8.Q11": {
    "id": "E4.N8.Q11",
    "question": "Utilisé pour générer ou manipuler du contenu ?",
    "type": "tags",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q11.A",
        "label": "Texte",
        "score_impact": 0
      },
      {
        "code": "E4.N8.Q11.B",
        "label": "Image",
        "score_impact": -5,
        "category_impacts": {
          "social_environmental": -5
        }
      },
      {
        "code": "E4.N8.Q11.C",
        "label": "audio",
        "score_impact": -5,
        "category_impacts": {
          "social_environmental": -5
        }
      },
      {
        "code": "E4.N8.Q11.D",
        "label": "Vidéo",
        "score_impact": -5,
        "category_impacts": {
          "social_environmental": -5
        }
      }
    ]
  },
  "E4.N8.Q12": {
    "id": "E4.N8.Q12",
    "question": "Votre système d'IA est utilisé dans des jeux vidéos ou comme filtre anti-spam ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E4.N8.Q12.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E4.N8.Q12.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "privacy_data": -5
        }
      }
    ]
  },
  "E5.N9.Q1": {
    "id": "E5.N9.Q1",
    "question": "Avez-vous établi et maintenez-vous un système de gestion des risques ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E5.N9.Q1.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q1.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "technical_robustness": -5
        }
      }
    ]
  },
  "E5.N9.Q2": {
    "id": "E5.N9.Q2",
    "question": "Votre système de gestion des risques comprend-il l'identification et l'analyse des risques et des utilisations abusives ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E5.N9.Q2.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q2.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "technical_robustness": -5
        }
      }
    ]
  },
  "E5.N9.Q3": {
    "id": "E5.N9.Q3",
    "question": "Des mesures d'atténuation des risques sont-elles mises en œuvre et leur efficacité testée, garantissant que le risque résiduel est acceptable ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E5.N9.Q3.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q3.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "technical_robustness": -5
        }
      }
    ]
  },
  "E5.N9.Q4": {
    "id": "E5.N9.Q4",
    "question": "Avez-vous établi une documentation technique complète pour votre système d'IA ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E5.N9.Q4.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q4.B",
        "label": "Non",
        "score_impact": -10,
        "category_impacts": {
          "human_oversight": -10
        }
      }
    ]
  },
  "E5.N9.Q5": {
    "id": "E5.N9.Q5",
    "question": "Quelles sont les types de données traitées en entrée ?",
    "type": "tags",
    "required": true,
    "options": [
      {
        "code": "E5.N9.Q5.A",
        "label": "Publiques",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q5.B",
        "label": "Personnelles",
        "score_impact": -10,
        "category_impacts": {
          "privacy_data": -10
        }
      },
      {
        "code": "E5.N9.Q5.C",
        "label": "Stratégiques",
        "score_impact": -10,
        "category_impacts": {
          "privacy_data": -5
        }
      },
      {
        "code": "E5.N9.Q5.D",
        "label": "sensibles",
        "score_impact": -10,
        "category_impacts": {
          "privacy_data": -5
        }
      }
    ]
  },
  "E5.N9.Q6": {
    "id": "E5.N9.Q6",
    "question": "Avez vous de procédures de vérification de la qualité des données ?",
    "type": "conditional",
    "required": true,
    "conditionalFields": [
      {
        "key": "procedures_details",
        "label": "Précisions",
        "placeholder": "Décrivez vos procédures..."
      }
    ],
    "options": [
      {
        "code": "E5.N9.Q6.B",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q6.C",
        "label": "Si oui préciser",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q6.A",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "privacy_data": -5
        }
      }
    ]
  },
  "E5.N9.Q7": {
    "id": "E5.N9.Q7",
    "question": "Tenez vous un registre centralisé de vos systèmes d'IA ?",
    "type": "conditional",
    "required": true,
    "conditionalFields": [
      {
        "key": "registry_type",
        "label": "Type",
        "placeholder": "Interne"
      },
      {
        "key": "system_name",
        "label": "Système",
        "placeholder": "MaydAI"
      }
    ],
    "options": [
      {
        "code": "E5.N9.Q7.B",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q7.C",
        "label": "Si oui préciser",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q7.A",
        "label": "Non",
        "score_impact": -10,
        "category_impacts": {
          "human_oversight": -10
        }
      }
    ]
  },
  "E5.N9.Q8": {
    "id": "E5.N9.Q8",
    "question": "Avez vous une étape de surveillance humaine dans votre système d'IA ?",
    "type": "conditional",
    "required": true,
    "conditionalFields": [
      {
        "key": "supervisor_name",
        "label": "Nom prénom",
        "placeholder": ""
      },
      {
        "key": "supervisor_role",
        "label": "Rôle",
        "placeholder": ""
      }
    ],
    "options": [
      {
        "code": "E5.N9.Q8.B",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q8.C",
        "label": "Si oui préciser",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q8.A",
        "label": "Non",
        "score_impact": -10,
        "category_impacts": {
          "human_oversight": -10
        }
      }
    ]
  },
  "E5.N9.Q9": {
    "id": "E5.N9.Q9",
    "question": "Vérifiez vous l'exactitude, la robustesse et la cybersécurité de votre système d'IA ?",
    "type": "conditional",
    "required": true,
    "conditionalFields": [
      {
        "key": "security_details",
        "label": "Détails",
        "placeholder": "Décrivez vos procédures..."
      }
    ],
    "options": [
      {
        "code": "E5.N9.Q9.B",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q9.C",
        "label": "Si oui préciser",
        "score_impact": 0
      },
      {
        "code": "E5.N9.Q9.A",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "technical_robustness": -5
        }
      }
    ]
  },
  "E6.N10.Q1": {
    "id": "E6.N10.Q1",
    "question": "Lorsque votre système d'IA interagit avec des personnes, sont elles informées ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E6.N10.Q1.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E6.N10.Q1.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "transparency": -5
        }
      }
    ]
  },
  "E6.N10.Q2": {
    "id": "E6.N10.Q2",
    "question": "Lorsque votre système d'IA génère ou manipule du contenu, est ce que ce dernier est marqué par un format lisible et reconnaissable ?",
    "type": "radio",
    "required": true,
    "options": [
      {
        "code": "E6.N10.Q2.A",
        "label": "Oui",
        "score_impact": 0
      },
      {
        "code": "E6.N10.Q2.B",
        "label": "Non",
        "score_impact": -5,
        "category_impacts": {
          "transparency": -5
        }
      }
    ]
  }
};
// ===== FONCTION PRINCIPALE =====
Deno.serve(async (req) => {
  // Configuration CORS pour permettre les appels depuis le frontend
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // ===== ÉTAPE 1: INITIALISATION =====
    // Récupérer les variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Créer le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // ===== ÉTAPE 2: VALIDATION DE LA REQUÊTE =====
    // Extraire l'ID du use case depuis la requête
    const { usecase_id } = await req.json();
    
    if (!usecase_id) {
      return createErrorResponse('usecase_id est requis', 400, corsHeaders);
    }
    // ===== ÉTAPE 3: RÉCUPÉRATION DES RÉPONSES =====
    // Récupérer toutes les réponses de l'utilisateur pour ce use case
    const { data: responses, error: responsesError } = await supabase
      .from('usecase_responses')
      .select('*')
      .eq('usecase_id', usecase_id);
    
    if (responsesError) {
      console.error('Erreur lors de la récupération des réponses:', responsesError);
      return createErrorResponse('Impossible de récupérer les réponses', 500, corsHeaders);
    }
    
    if (!responses || responses.length === 0) {
      return createErrorResponse('Aucune réponse trouvée pour ce use case', 404, corsHeaders);
    }
    // ===== ÉTAPE 4: CALCUL DU SCORE DE BASE =====
    // Calculer le score basé sur les réponses
    const baseScoreResult = calculateBaseScore(responses);
    // ===== ÉTAPE 5: RÉCUPÉRATION DU MODÈLE COMPL-AI =====
    // Récupérer les informations du modèle IA associé au use case
    const { data: usecase, error: usecaseError } = await supabase
      .from('usecases')
      .select(`
        primary_model_id,
        compl_ai_models (
          model_name,
          compl_ai_evaluations (
            score
          )
        )
      `)
      .eq('id', usecase_id)
      .single();
    
    if (usecaseError) {
      console.warn('Impossible de récupérer les infos du modèle:', usecaseError);
    }
    // ===== ÉTAPE 6: CALCUL DU SCORE DU MODÈLE =====
    let modelScore = null;
    let hasValidModelScore = false;
    
    // Vérifier si le use case a un modèle associé avec des évaluations
    if (usecase?.compl_ai_models?.compl_ai_evaluations) {
      // Filtrer les scores valides (non null)
      const validScores = usecase.compl_ai_models.compl_ai_evaluations
        .filter((evaluation: any) => evaluation.score !== null)
        .map((evaluation: any) => evaluation.score);
      
      // Calculer le score moyen si des scores existent
      if (validScores.length > 0) {
        const totalScore = validScores.reduce((sum: number, score: number) => sum + score, 0);
        const averageScore = totalScore / validScores.length;
        
        // Convertir le score (0-1) en score sur 20
        modelScore = averageScore * COMPL_AI_MULTIPLIER;
        hasValidModelScore = true;
      }
    }
    // ===== ÉTAPE 7: CALCUL DU SCORE FINAL =====
    // Formule Excel : ((Score_base + (Score_model_% * 20)) / 120) * 100
    // Si pas de modèle : ((Score_base + 0) / 120) * 100
    // Exemple: base 90, modèle 17.41/20 (87.05%) → ((90 + (0.8705 * 20)) / 120) * 100 = 89.51%
    let finalScore = 0;
    
    if (baseScoreResult.is_eliminated) {
      // Si éliminé, le score final est toujours 0
      finalScore = 0;
    } else {
      // Calculer selon la formule Excel de moyenne pondérée
      let modelContribution = 0;
      
      if (hasValidModelScore && modelScore !== null) {
        // Convertir le score modèle (0-20) en pourcentage (0-1)
        const modelPercentage = modelScore / COMPL_AI_MULTIPLIER;
        // Contribution du modèle : pourcentage * poids du modèle
        modelContribution = modelPercentage * MODEL_SCORE_WEIGHT;
      }
      
      // Formule finale : ((score_base + model_contribution) / total_weight) * 100
      finalScore = ((baseScoreResult.score_base + modelContribution) / TOTAL_WEIGHT) * 100;
    }
    
    // ===== ÉTAPE 8: MISE À JOUR EN BASE DE DONNÉES =====
    const { error: updateError } = await supabase
      .from('usecases')
      .update({
        score_base: baseScoreResult.score_base,
        score_model: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
        score_final: roundToTwoDecimals(finalScore),
        is_eliminated: baseScoreResult.is_eliminated,
        elimination_reason: baseScoreResult.elimination_reason,
        last_calculation_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', usecase_id);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      return createErrorResponse('Impossible de mettre à jour les scores', 500, corsHeaders);
    }
    // ===== ÉTAPE 9: RETOURNER LE RÉSULTAT =====
    return new Response(JSON.stringify({
      success: true,
      usecase_id,
      scores: {
        score_base: baseScoreResult.score_base,
        score_model: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
        score_final: roundToTwoDecimals(finalScore),
        is_eliminated: baseScoreResult.is_eliminated,
        elimination_reason: baseScoreResult.elimination_reason
      },
      calculation_details: {
        ...baseScoreResult.calculation_details,
        model_score: modelScore !== null ? roundToTwoDecimals(modelScore) : null,
        model_percentage: modelScore !== null ? roundToTwoDecimals(modelScore / COMPL_AI_MULTIPLIER * 100) : null,
        has_model_score: hasValidModelScore,
        formula_used: hasValidModelScore && modelScore !== null 
          ? `((${baseScoreResult.score_base} + (${roundToTwoDecimals(modelScore / COMPL_AI_MULTIPLIER * 100)}% * ${MODEL_SCORE_WEIGHT})) / ${TOTAL_WEIGHT}) * 100`
          : `((${baseScoreResult.score_base} + 0) / ${TOTAL_WEIGHT}) * 100`,
        weights: {
          base_score_weight: BASE_SCORE_WEIGHT,
          model_score_weight: MODEL_SCORE_WEIGHT,
          total_weight: TOTAL_WEIGHT
        }
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Gestion des erreurs inattendues
    console.error('Erreur inattendue:', error);
    return createErrorResponse(
      'Erreur serveur interne',
      500,
      corsHeaders
    );
  }
});
/**
 * Récupère les codes de réponse sélectionnés par l'utilisateur
 * @param response - Réponse de l'utilisateur à une question
 * @returns Liste des codes de réponse
 */
function getSelectedCodes(response: any): string[] {
  // Cas 1: Réponse unique (radio)
  if (response.single_value) {
    // Nettoyer la valeur des guillemets éventuels
    const cleanValue = response.single_value
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"');
    return [cleanValue];
  }
  
  // Cas 2: Réponses multiples (checkbox)
  if (response.multiple_codes && Array.isArray(response.multiple_codes)) {
    return response.multiple_codes;
  }
  
  // Cas 3: Aucune réponse
  return [];
}

/**
 * Calcule le score de base à partir des réponses de l'utilisateur
 * @param responses - Toutes les réponses de l'utilisateur
 * @returns Objet contenant le score et les détails du calcul
 */
function calculateBaseScore(responses: any[]) {
  let totalImpact = 0;
  let isEliminated = false;
  let eliminationReason = '';
  
  // Parcourir toutes les réponses
  for (const response of responses) {
    const question = QUESTIONS_DATA[response.question_code];
    
    // Vérifier que la question existe
    if (!question) {
      console.warn(`Question ${response.question_code} non trouvée`);
      continue;
    }
    
    // Récupérer les codes de réponse sélectionnés
    const selectedCodes = getSelectedCodes(response);
    
    // Analyser chaque réponse sélectionnée
    for (const selectedCode of selectedCodes) {
      const option = question.options.find((opt: any) => opt.code === selectedCode);
      
      if (!option) {
        console.warn(`Option ${selectedCode} non trouvée`);
        continue;
      }
      
      // Vérifier si c'est une réponse éliminatoire
      if (option.is_eliminatory) {
        isEliminated = true;
        eliminationReason = `Réponse éliminatoire: ${option.label}`;
        break; // Arrêter l'analyse
      }
      
      // Ajouter l'impact au score total
      if (option.score_impact) {
        totalImpact += option.score_impact;
      }
    }
    
    // Si éliminé, arrêter l'analyse des autres questions
    if (isEliminated) break;
  }
  
  // Calculer le score final
  // Si éliminé: score = 0
  // Sinon: score = BASE_SCORE + impacts (minimum 0)
  const finalScore = isEliminated ? 0 : Math.max(0, BASE_SCORE + totalImpact);
  
  return {
    score_base: finalScore,
    is_eliminated: isEliminated,
    elimination_reason: eliminationReason,
    calculation_details: {
      base_score: BASE_SCORE,
      total_impact: totalImpact,
      final_base_score: finalScore
    }
  };
}
