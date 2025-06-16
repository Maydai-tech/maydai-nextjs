import { Question } from '../types/usecase'

export const QUESTIONS: Record<string, Question> = {
  'E4.N7.Q1': {
    id: 'E4.N7.Q1',
    question: 'Quelle phrase décrit le mieux votre situation ?',
    type: 'radio',
    options: [
      "Je suis utilisateur de ce système d'IA pour mon entreprise et je réponds concernant son intégration dans nos opérations et son impact sur nos activités.",
      "Je suis fabricant d'un produit intégrant ce système d'IA et je réponds concernant la conformité du système d'IA et son impact sur la sécurité et le fonctionnement de notre produit.",
      "Je suis fournisseur de ce système d'IA et je réponds à ce questionnaire sur sa conception, son développement et sa mise sur le marché.",
      "Je distribue ce système d'IA et je réponds concernant sa mise à disposition sur le marché et sa conformité avec les exigences réglementaires.",
      "Je suis importateur de ce système d'IA et je réponds concernant sa conformité avec les exigences de l'UE et les contrôles effectués à l'importation.",
      "Je suis représentant autorisé du fournisseur de ce système d'IA et je réponds au nom de ce dernier, concernant les exigences réglementaires."
    ],
    required: true
  },
  'E4.N7.Q2': {
    id: 'E4.N7.Q2',
    question: "Votre système d'IA est utilisé dans un ou des domaines suivants ?",
    type: 'checkbox',
    options: [
      'Identification Biométrique à Distance en Temps Réel dans les Espaces Publics',
      'Emploi, gestion des travailleurs et accès à l\'emploi indépendant',
      'Gestion et exploitation des infrastructures critiques',
      'Accès et jouissance de services essentiels privés et publics essentiels',
      "Migration, asile et gestion des contrôles aux frontières",
      "Administration de la justice et processus démocratiques",
      "Éducation et formation professionnelle",
      "Activités répressives (Application de la loi)",
      "Aucun de ces domaines"
    ],
    required: true
  },
  'E4.N7.Q3': {
    id: 'E4.N7.Q3',
    question: "Votre système d'IA a pour finalité une ou des activités suivantes ?",
    type: 'checkbox',
    options: [
      'Identification biométrique et catégorisation des personnes physiques',
      'Catégorisation Biométrique Basée sur des Caractéristiques Sensibles',
      'Déduction des Émotions sur le Lieu de Travail et d\'Enseignement',
      'Création de Bases de Données de Reconnaissance Faciale par Moissonnage Non Ciblé',
      'Profilage pour Évaluation du Risque Criminel',
      'Exploitation des Vulnérabilités',
      'Manipulation et Tromperie',
      'Notation Sociale',
      'Aucune de ces activités'
    ],
    required: true
  },
  // High-risk questions sequence
  'E5.N8.Q1': {
    id: 'E5.N8.Q1',
    question: 'Avez-vous établi et maintenez-vous un système de gestion des risques ?',
    type: 'radio',
    options: ['Yes', 'No'],
    required: true
  },
  'E5.N8.Q2': {
    id: 'E5.N8.Q2',
    question: "Votre système de gestion des risques comprend-il l'identification et l'analyse des risques et des utilisations abusives ?",
    type: 'radio',
    options: ['Yes', 'No'],
    required: true
  },
  'E5.N9.Q3': {
    id: 'E5.N9.Q3',
    question: "Des mesures d'atténuation des risques sont-elles mises en œuvre et leur efficacité testée, garantissant que le risque résiduel est acceptable ?",
    type: 'radio',
    options: ['Yes', 'No'],
    required: true
  },
  'E5.N9.Q4': {
    id: 'E5.N9.Q4',
    question: "Avez-vous établi une documentation technique complète pour votre système d'IA ?",
    type: 'radio',
    options: ['Yes', 'No'],
    required: true
  },
  'E5.N9.Q5': {
    id: 'E5.N9.Q5',
    question: 'Quelles sont les types de données traitées en entrée ?',
    type: 'tags',
    options: ['Publiques', 'Personnelles', 'Stratégiques', 'sensibles'],
    required: true
  },
  'E5.N9.Q6': {
    id: 'E5.N9.Q6',
    question: 'Avez vous de procédures de vérification de la qualité des données ?',
    type: 'conditional',
    options: ['Non', 'Oui', 'Si oui préciser'],
    conditionalFields: [{ label: 'Précisions', placeholder: 'Décrivez vos procédures...' }],
    required: true
  },
  'E5.N9.Q7': {
    id: 'E5.N9.Q7',
    question: 'Tenez vous un registre centralisé de vos systèmes d\'IA ?',
    type: 'conditional',
    options: ['Non', 'Oui', 'Si oui préciser'],
    conditionalFields: [
      { label: 'Type', placeholder: 'Interne' },
      { label: 'Système', placeholder: 'MaydAI' }
    ],
    required: true
  },
  'E5.N9.Q8': {
    id: 'E5.N9.Q8',
    question: 'Avez vous une étape de surveillance humaine dans votre système d\'IA ?',
    type: 'conditional',
    options: ['Non', 'Oui', 'Si oui préciser'],
    conditionalFields: [
      { label: 'Nom prénom', placeholder: '' },
      { label: 'Rôle', placeholder: '' }
    ],
    required: true
  },
  'E5.N9.Q9': {
    id: 'E5.N9.Q9',
    question: 'Vérifiez vous l\'exactitude, la robustesse et la cybersécurité de votre système d\'IA ?',
    type: 'conditional',
    options: ['Non', 'Oui', 'Si oui préciser'],
    conditionalFields: [
      { label: 'Détails', placeholder: 'Décrivez vos procédures...' }
    ],
    required: true
  },
  // Critical question
  'E4.N8.Q12': {
    id: 'E4.N8.Q12',
    question: "Votre système d'IA est utilisé dans des jeux vidéos ou comme filtre anti-spam ?",
    type: 'radio',
    options: ['Oui', 'Non'],
    required: true
  },
  // Additional questions
  'E4.N8.Q9': {
    id: 'E4.N8.Q9',
    question: "Votre système d'IA interagit-il avec des personnes physiques ?",
    type: 'radio',
    options: ['Oui', 'Non'],
    required: true
  },
  'E4.N8.Q10': {
    id: 'E4.N8.Q10',
    question: 'Utilisé par combien de personnes physiques par mois ?',
    type: 'conditional',
    options: ['< de 100', '> à 100', '> à 1000', '> à 10 000', '> à 100 000', '> à 1 M', 'Other'],
    conditionalFields: [{ label: 'Autre nombre', placeholder: 'Précisez...' }],
    required: true
  },
  'E4.N8.Q11': {
    id: 'E4.N8.Q11',
    question: 'Utilisé pour générer ou manipuler du contenu ?',
    type: 'tags',
    options: ['Texte', 'Image', 'audio', 'Vidéo'],
    required: true
  },
  // Transparency questions
  'E6.N10.Q1': {
    id: 'E6.N10.Q1',
    question: "Lorsque votre système d'IA interagit avec des personnes, sont elles informées ?",
    type: 'radio',
    options: ['Oui', 'Non'],
    required: true
  },
  'E6.N10.Q2': {
    id: 'E6.N10.Q2',
    question: "Lorsque votre système d'IA génère ou manipule du contenu, est ce que ce dernier est marqué par un format lisible et reconnaissable ?",
    type: 'radio',
    options: ['Oui', 'Non'],
    required: true
  }
} 