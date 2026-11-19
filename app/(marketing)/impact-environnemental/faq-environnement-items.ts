/** Source unique Q/R — UI (FaqEnvironnement) et JSON-LD FAQPage (page.tsx). */
export const FAQ_ENVIRONNEMENT_ITEMS = [
  {
    id: 'acv',
    question:
      "Comment est calculé l'impact environnemental de l'IA sur ce simulateur ?",
    answer:
      "Les mesures s'appuient sur la méthodologie open-source EcoLogits, fondée sur une Analyse du Cycle de Vie (ACV) conforme à la norme ISO 14044. La modélisation est ascendante (bottom-up) : l'impact de chaque composant du service est calculé puis agrégé. Le périmètre couvre l'inférence (génération de réponses) et l'hébergement en data center (calcul et refroidissement), en proportionnalité stricte des tokens consommés pour votre cas d'usage. L'entraînement des modèles et les terminaux utilisateurs sont exclus.",
  },
  {
    id: 'indicators',
    question:
      "Quels indicateurs d'impact environnemental (GWP, ADPe, etc.) sont pris en compte ?",
    answer:
      "L'évaluation porte sur quatre indicateurs majeurs de l'ACV : le réchauffement climatique (GWP, équivalents CO₂), l'épuisement des ressources minérales (ADPe, équivalents antimoine), l'énergie primaire (PE, en mégajoules) et l'empreinte eau (WCF, consommation des centres de données). Le simulateur MaydAI met en avant la consommation électrique (Wh) et l'ADPe pour comparer rapidement deux modèles de langage (LLM) sur un même cas d'usage.",
  },
  {
    id: 'green-it',
    question:
      "Quels leviers Green IT pour réduire l'impact environmental IA de vos infrastructures ?",
    answer:
      "Comparez systématiquement les modèles et architectures avant déploiement, ajustez le volume de tokens (prompts, sorties, fréquence d'appels) à chaque cas d'usage, et privilégiez les capacités multimodales uniquement lorsqu'elles sont nécessaires. Intégrez ces critères dans votre éco-conception logicielle et vos appels d'offres cloud pour piloter une démarche Green IT mesurable sur l'impact environnemental IA de vos systèmes.",
  },
] as const
