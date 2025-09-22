  const plans = [
    {
      id: 'starter',
      name: 'La Mise en Bouche',
      description: 'Vous souhaitez agir tout de suite, vous mettre en conformité ou tester des projets IA.',
      price: { monthly: 0, yearly: 0 },
      stripePriceId: { 
        monthly: 'price_1S8JY316FiJU1KS5V9k250i7', // Gratuit
        yearly: 'price_1S8JY316FiJU1KS5V9k250i7'   // Gratuit
      },
      icon: 'level-up.png',
      color: 'blue',
      features: [
        '1 registre IA Act',
        '1 Dashboard Entreprise',
        '6 cas d\'usage IA disponibles',
        '6 modèles de cas d\'usage disponibles',
        '3 invitations pour collaborer',
        'Support Email'
      ],
      limitations: [],
      free: true
    },
    {
      id: 'pro',
      name: 'Le Lève-tôt',
      description: 'Vous avez la volonté de centraliser et d\'évaluer tous les cas d\'usages de votre entreprise et/ou de ses filiales.',
      price: { monthly: 10, yearly: 100 },
      stripePriceId: { 
        monthly: 'price_1S8JkN16FiJU1KS5MjGTdcIo', // 10€/mois
        yearly: 'price_1S8JkN16FiJU1KS5L9MBToBM'   // 100€/an
      },
      icon: 'le-coucher-du-soleil.png',
      color: 'purple',
      features: [
        '1 super registre IA Act',
        '3 registres IA Act',
        '4 Dashboards Entreprise',
        '12 cas d\'usage IA disponibles',
        '12 modèles de cas d\'usage disponibles',
        '6 invitations pour collaborer',
        'Support prioritaire'
      ],
      limitations: [],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Le Pilote',
      description: 'Devis entreprise: Vous avez besoin d\'être accompagné en matière de formation, de création d\'audit IA act et de registre entreprise.',
      price: { monthly: 1000, yearly: 10000 },
      stripePriceId: { 
        monthly: 'price_1S8IL716FiJU1KS5cpmO81Ct', // 1000€/mois
        yearly: 'price_1S8IL716FiJU1KS5cpmO81Ct'   // 10000€/an (même prix pour l'instant)
      },
      icon: 'chapeau-de-pilote.png',
      color: 'gold',
      features: [
        '1 formation sur site',
        '1 atelier audit IA act',
        'Création du Dashboard Entreprise',
        'Cas d\'usage IA illimités',
        'Collaboration illimitée',
        'Support juridique relecture cas d\'usage',
        'Support prioritaire'
      ],
      limitations: [],
      custom: true
    }
  ]
