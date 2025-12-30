/**
 * Données FAQ pour la page Tarifs
 * Source unique de vérité pour le composant UI et les données structurées JSON-LD
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqData: FaqItem[] = [
  {
    question: "Qu'est-ce que l'AI Act de l'UE et quel est son impact sur mon entreprise ?",
    answer: "L'AI Act de l'UE est le premier règlement complet au monde sur l'intelligence artificielle. Il classe les systèmes d'IA selon leur niveau de risque. Pour les entreprises, cela implique de nouvelles obligations de transparence, de gestion des risques et de gouvernance des données. MaydAI vous aide à naviguer dans ce cadre en identifiant précisément vos obligations."
  },
  {
    question: "Comment la plateforme MaydAI simplifie-t-elle la mise en conformité ?",
    answer: "MaydAI centralise et automatise vos processus de gouvernance. Grâce à nos flux de travail automatisés et nos modèles pré-établis alignés sur les textes réglementaires, nous réduisons les tâches manuelles et administratives jusqu'à 70 %. La plateforme agit comme un centre de contrôle unique."
  },
  {
    question: "MaydAI gère-t-elle d'autres cadres réglementaires (GDPR, ISO, NIST) ?",
    answer: "Absolument. MaydAI est conçue pour une conformité globale. En plus de l'AI Act, notre plateforme intègre les exigences du RGPD, du NIST AI RMF et de la norme ISO 42001, assurant une gouvernance cohérente à l'échelle internationale via notre architecture multi-entités."
  },
  {
    question: "Quel est le délai moyen pour atteindre la conformité avec votre solution ?",
    answer: "En structurant et en accélérant les démarches, la plupart des organisations utilisant MaydAI atteignent un état de conformité en moins de 6 semaines, ce qui représente un gain de temps considérable par rapport aux méthodes manuelles."
  },
  {
    question: "Comment MaydAI assiste-t-elle les équipes juridiques ?",
    answer: "MaydAI optimise le temps des juristes en automatisant la collecte de preuves et la documentation technique. Cela leur permet de se concentrer sur l'analyse stratégique et la gestion des risques complexes plutôt que sur la gestion administrative."
  },
  {
    question: "Comment la plateforme aide-t-elle à gérer les risques et la fiabilité des modèles ?",
    answer: "MaydAI propose une approche proactive de la gestion des risques. Nous fournissons des outils pour cartographier les risques, évaluer la robustesse des modèles et surveiller la performance pour détecter les dérives comportementales ou les biais."
  },
  {
    question: "La solution permet-elle de détecter ou prévenir les \"hallucinations\" de l'IA ?",
    answer: "MaydAI renforce l'observabilité et la traçabilité. En documentant les sources de données et en surveillant les sorties des modèles, vous pouvez identifier plus rapidement les incohérences et instaurer des protocoles de validation humaine (Human-in-the-loop)."
  },
  {
    question: "La conformité est-elle un processus ponctuel ou continu ?",
    answer: "C'est un cycle continu. MaydAI est conçue pour le monitoring en temps réel et vous alerte en cas de changements réglementaires ou de dérive de vos systèmes, garantissant une conformité sur le long terme."
  }
];

