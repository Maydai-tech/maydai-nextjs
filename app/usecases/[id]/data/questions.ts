import { Question } from '../types/usecase'

export const QUESTIONS: Record<string, Question> = {
  'E4.N7.Q1': {
    id: 'E4.N7.Q1',
    question: 'Quelle phrase décrit le mieux votre situation ?',
    type: 'radio',
    options: [
      { code: 'E4.N7.Q1.A', label: "Je suis utilisateur de ce système d'IA pour mon entreprise et je réponds concernant son intégration dans nos opérations et son impact sur nos activités." },
      { code: 'E4.N7.Q1.B', label: "Je suis fabricant d'un produit intégrant ce système d'IA et je réponds concernant la conformité du système d'IA et son impact sur la sécurité et le fonctionnement de notre produit." },
      { code: 'E4.N7.Q1.C', label: "Je suis fournisseur de ce système d'IA et je réponds à ce questionnaire sur sa conception, son développement et sa mise sur le marché." },
      { code: 'E4.N7.Q1.D', label: "Je distribue ce système d'IA et je réponds concernant sa mise à disposition sur le marché et sa conformité avec les exigences réglementaires." },
      { code: 'E4.N7.Q1.E', label: "Je suis importateur de ce système d'IA et je réponds concernant sa conformité avec les exigences de l'UE et les contrôles effectués à l'importation." },
      { code: 'E4.N7.Q1.F', label: "Je suis représentant autorisé du fournisseur de ce système d'IA et je réponds au nom de ce dernier, concernant les exigences réglementaires." }
    ],
    required: true
  },
  'E4.N7.Q2': {
    id: 'E4.N7.Q2',
    question: "Votre système d'IA est utilisé dans un ou des domaines suivants ?",
    type: 'checkbox',
    options: [
      { code: 'E4.N7.Q2.A', label: 'Identification Biométrique à Distance en Temps Réel dans les Espaces Publics' },
      { code: 'E4.N7.Q2.B', label: 'Emploi, gestion des travailleurs et accès à l\'emploi indépendant' },
      { code: 'E4.N7.Q2.C', label: 'Gestion et exploitation des infrastructures critiques' },
      { code: 'E4.N7.Q2.D', label: 'Accès et jouissance de services essentiels privés et publics essentiels' },
      { code: 'E4.N7.Q2.E', label: "Migration, asile et gestion des contrôles aux frontières" },
      { code: 'E4.N7.Q2.F', label: "Administration de la justice et processus démocratiques" },
      { code: 'E4.N7.Q2.G', label: "Éducation et formation professionnelle" },
      { code: 'E4.N7.Q2.H', label: "Activités répressives (Application de la loi)" },
      { code: 'E4.N7.Q2.I', label: "Aucun de ces domaines" }
    ],
    required: true
  },
  'E4.N7.Q3': {
    id: 'E4.N7.Q3',
    question: "Votre système d'IA a pour finalité une ou des activités suivantes ?",
    type: 'checkbox',
    options: [
      { code: 'E4.N7.Q3.A', label: 'Identification biométrique et catégorisation des personnes physiques' },
      { code: 'E4.N7.Q3.B', label: 'Catégorisation Biométrique Basée sur des Caractéristiques Sensibles' },
      { code: 'E4.N7.Q3.C', label: 'Déduction des Émotions sur le Lieu de Travail et d\'Enseignement' },
      { code: 'E4.N7.Q3.D', label: 'Création de Bases de Données de Reconnaissance Faciale par Moissonnage Non Ciblé' },
      { code: 'E4.N7.Q3.E', label: 'Profilage pour Évaluation du Risque Criminel' },
      { code: 'E4.N7.Q3.F', label: 'Exploitation des Vulnérabilités' },
      { code: 'E4.N7.Q3.G', label: 'Manipulation et Tromperie' },
      { code: 'E4.N7.Q3.H', label: 'Notation Sociale' },
      { code: 'E4.N7.Q3.I', label: 'Aucune de ces activités' }
    ],
    required: true
  },
  // High-risk questions sequence
  'E5.N8.Q1': {
    id: 'E5.N8.Q1',
    question: 'Avez-vous établi et maintenez-vous un système de gestion des risques ?',
    type: 'radio',
    options: [
      { code: 'E5.N8.Q1.A', label: 'Yes' },
      { code: 'E5.N8.Q1.B', label: 'No' }
    ],
    required: true
  },
  'E5.N8.Q2': {
    id: 'E5.N8.Q2',
    question: "Votre système de gestion des risques comprend-il l'identification et l'analyse des risques et des utilisations abusives ?",
    type: 'radio',
    options: [
      { code: 'E5.N8.Q2.A', label: 'Yes' },
      { code: 'E5.N8.Q2.B', label: 'No' }
    ],
    required: true
  },
  'E5.N9.Q3': {
    id: 'E5.N9.Q3',
    question: "Des mesures d'atténuation des risques sont-elles mises en œuvre et leur efficacité testée, garantissant que le risque résiduel est acceptable ?",
    type: 'radio',
    options: [
      { code: 'E5.N9.Q3.A', label: 'Yes' },
      { code: 'E5.N9.Q3.B', label: 'No' }
    ],
    required: true
  },
  'E5.N9.Q4': {
    id: 'E5.N9.Q4',
    question: "Avez-vous établi une documentation technique complète pour votre système d'IA ?",
    type: 'radio',
    options: [
      { code: 'E5.N9.Q4.A', label: 'Yes' },
      { code: 'E5.N9.Q4.B', label: 'No' }
    ],
    required: true
  },
  'E5.N9.Q5': {
    id: 'E5.N9.Q5',
    question: 'Quelles sont les types de données traitées en entrée ?',
    type: 'tags',
    options: [
      { code: 'E5.N9.Q5.A', label: 'Publiques' },
      { code: 'E5.N9.Q5.B', label: 'Personnelles' },
      { code: 'E5.N9.Q5.C', label: 'Stratégiques' },
      { code: 'E5.N9.Q5.D', label: 'sensibles' }
    ],
    required: true
  },
  'E5.N9.Q6': {
    id: 'E5.N9.Q6',
    question: 'Avez vous de procédures de vérification de la qualité des données ?',
    type: 'conditional',
    options: [
      { code: 'E5.N9.Q6.A', label: 'Non' },
      { code: 'E5.N9.Q6.B', label: 'Oui' },
      { code: 'E5.N9.Q6.C', label: 'Si oui préciser' }
    ],
    conditionalFields: [{ label: 'Précisions', placeholder: 'Décrivez vos procédures...' }],
    required: true
  },
  'E5.N9.Q7': {
    id: 'E5.N9.Q7',
    question: 'Tenez vous un registre centralisé de vos systèmes d\'IA ?',
    type: 'conditional',
    options: [
      { code: 'E5.N9.Q7.A', label: 'Non' },
      { code: 'E5.N9.Q7.B', label: 'Oui' },
      { code: 'E5.N9.Q7.C', label: 'Si oui préciser' }
    ],
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
    options: [
      { code: 'E5.N9.Q8.A', label: 'Non' },
      { code: 'E5.N9.Q8.B', label: 'Oui' },
      { code: 'E5.N9.Q8.C', label: 'Si oui préciser' }
    ],
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
    options: [
      { code: 'E5.N9.Q9.A', label: 'Non' },
      { code: 'E5.N9.Q9.B', label: 'Oui' },
      { code: 'E5.N9.Q9.C', label: 'Si oui préciser' }
    ],
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
    options: [
      { code: 'E4.N8.Q12.A', label: 'Oui' },
      { code: 'E4.N8.Q12.B', label: 'Non' }
    ],
    required: true
  },
  // Additional questions
  'E4.N8.Q9': {
    id: 'E4.N8.Q9',
    question: "Votre système d'IA interagit-il avec des personnes physiques ?",
    type: 'radio',
    options: [
      { code: 'E4.N8.Q9.A', label: 'Oui' },
      { code: 'E4.N8.Q9.B', label: 'Non' }
    ],
    required: true
  },
  'E4.N8.Q10': {
    id: 'E4.N8.Q10',
    question: 'Utilisé par combien de personnes physiques par mois ?',
    type: 'conditional',
    options: [
      { code: 'E4.N8.Q10.A', label: '< de 100' },
      { code: 'E4.N8.Q10.B', label: '> à 100' },
      { code: 'E4.N8.Q10.C', label: '> à 1000' },
      { code: 'E4.N8.Q10.D', label: '> à 10 000' },
      { code: 'E4.N8.Q10.E', label: '> à 100 000' },
      { code: 'E4.N8.Q10.F', label: '> à 1 M' },
      { code: 'E4.N8.Q10.G', label: 'Other' }
    ],
    conditionalFields: [{ label: 'Autre nombre', placeholder: 'Précisez...' }],
    required: true
  },
  'E4.N8.Q11': {
    id: 'E4.N8.Q11',
    question: 'Utilisé pour générer ou manipuler du contenu ?',
    type: 'tags',
    options: [
      { code: 'E4.N8.Q11.A', label: 'Texte' },
      { code: 'E4.N8.Q11.B', label: 'Image' },
      { code: 'E4.N8.Q11.C', label: 'audio' },
      { code: 'E4.N8.Q11.D', label: 'Vidéo' }
    ],
    required: true
  },
  // Transparency questions
  'E6.N10.Q1': {
    id: 'E6.N10.Q1',
    question: "Lorsque votre système d'IA interagit avec des personnes, sont elles informées ?",
    type: 'radio',
    options: [
      { code: 'E6.N10.Q1.A', label: 'Oui' },
      { code: 'E6.N10.Q1.B', label: 'Non' }
    ],
    required: true
  },
  'E6.N10.Q2': {
    id: 'E6.N10.Q2',
    question: "Lorsque votre système d'IA génère ou manipule du contenu, est ce que ce dernier est marqué par un format lisible et reconnaissable ?",
    type: 'radio',
    options: [
      { code: 'E6.N10.Q2.A', label: 'Oui' },
      { code: 'E6.N10.Q2.B', label: 'Non' }
    ],
    required: true
  }
} 