/** Source unique Q/R — UI (SupportFAQ) et JSON-LD FAQPage (SupportFAQStructuredData). */

export type SupportFAQItem = {
  q: string
  a: string
}

export type SupportFAQSection = {
  category: string
  items: SupportFAQItem[]
}

export const OWNER_SUPPORT_FAQ_SECTIONS: SupportFAQSection[] = [
  {
    category: "Cas d'usage et évaluation",
    items: [
      {
        q: 'Comment créer un nouveau cas d\'usage ?',
        a: 'Depuis le tableau de bord de ce registre, ajoutez un cas d\'usage puis complétez le questionnaire sur la page Évaluation. Les brouillons restent modifiables jusqu\'à finalisation.',
      },
      {
        q: 'Où consulter le rapport de conformité ?',
        a: 'Une fois le questionnaire terminé, le rapport est accessible depuis la fiche du cas d\'usage (menu Rapport).',
      },
    ],
  },
  {
    category: 'Conformité et preuves (todos)',
    items: [
      {
        q: 'À quoi servent les todos dans un dossier ?',
        a: 'Les todos structurent les preuves IA Act (formation, documentation technique, surveillance, etc.). Chaque todo précise ce qu\'il faut renseigner ou joindre.',
      },
      {
        q: 'Comment inviter des collaborateurs ?',
        a: 'En tant que propriétaire de ce registre, ouvrez Paramètres depuis le menu latéral, ou gérez les accès depuis la fiche d\'un cas d\'usage selon les droits que vous accordez.',
      },
    ],
  },
  {
    category: 'Facturation et limites',
    items: [
      {
        q: 'Comment gérer mon abonnement ?',
        a: 'Ouvrez Paramètres (menu de ce registre) puis la section Abonnement pour consulter votre plan et la facturation Stripe.',
      },
      {
        q: 'Que faire si j\'atteins une limite (cas d\'usage, stockage) ?',
        a: 'Un message indique la limite atteinte. Passez à une offre supérieure depuis les tarifs ou contactez le support via le formulaire ci-dessus.',
      },
    ],
  },
  {
    category: 'Compte et e-mail',
    items: [
      {
        q: 'Comment demander un changement d\'adresse e-mail ?',
        a: 'Utilisez le formulaire ci-dessus (motif « Compte — changement d\'email ») ou la procédure dans la section suivante.',
      },
    ],
  },
]

export const COLLABORATOR_SUPPORT_FAQ_SECTIONS: SupportFAQSection[] = [
  {
    category: 'Votre accès au registre',
    items: [
      {
        q: 'Quelle est la différence avec le propriétaire du registre ?',
        a: 'En tant collaborateur, vous travaillez sur les cas d\'usage auxquels vous avez accès. La facturation, l\'abonnement et certaines invitations sont gérées par le propriétaire.',
      },
      {
        q: 'Je n\'accède pas à un cas d\'usage — que faire ?',
        a: 'Demandez au propriétaire du registre de vous accorder l\'accès au cas concerné ou au registre entier.',
      },
    ],
  },
  {
    category: "Cas d'usage et évaluation",
    items: [
      {
        q: 'Puis-je compléter le questionnaire d\'un cas d\'usage ?',
        a: 'Oui, pour les dossiers auxquels vous avez accès. Ouvrez le cas d\'usage dans la liste de ce registre, puis la page Évaluation.',
      },
      {
        q: 'Où consulter le rapport de conformité ?',
        a: 'Le rapport est disponible sur la fiche du cas d\'usage une fois l\'évaluation finalisée par l\'équipe.',
      },
    ],
  },
  {
    category: 'Conformité et preuves (todos)',
    items: [
      {
        q: 'Puis-je renseigner les todos d\'un dossier ?',
        a: 'Vous pouvez contribuer aux todos des cas d\'usage auxquels vous avez accès, selon les droits définis par le propriétaire.',
      },
      {
        q: 'Puis-je inviter d\'autres collaborateurs ?',
        a: 'L\'invitation de collaborateurs est réservée au propriétaire du registre. Contactez-le si un collègue doit rejoindre le registre.',
      },
    ],
  },
  {
    category: 'Facturation',
    items: [
      {
        q: 'Comment modifier l\'abonnement ou les limites du registre ?',
        a: 'La gestion de l\'abonnement est réservée au propriétaire. Adressez-vous à lui ou utilisez le formulaire support pour signaler un blocage lié aux limites.',
      },
    ],
  },
  {
    category: 'Compte et e-mail',
    items: [
      {
        q: 'Comment changer mon adresse e-mail de connexion ?',
        a: 'Utilisez le formulaire ci-dessus (motif « Compte — changement d\'email »). Cela concerne votre compte personnel, pas celui du propriétaire du registre.',
      },
    ],
  },
]

export const PUBLIC_SUPPORT_FAQ_SECTIONS: SupportFAQSection[] = [
  {
    category: 'Découvrir MaydAI',
    items: [
      {
        q: 'Puis-je tester MaydAI sans engagement ?',
        a: 'Oui. L\'offre Freemium permet de créer un compte gratuitement, d\'ouvrir un premier registre IA et d\'analyser vos premiers cas d\'usage selon les critères de l\'IA Act européen.',
      },
      {
        q: 'MaydAI remplace-t-il un avis juridique ?',
        a: 'Non. MaydAI structure votre démarche de conformité et documente vos systèmes d\'IA. Pour une analyse juridique formelle, nous pouvons vous mettre en relation avec un professionnel du droit.',
      },
    ],
  },
  {
    category: 'IA Act européen',
    items: [
      {
        q: 'Où comprendre les échéances et les niveaux de risque ?',
        a: 'Consultez nos pages IA Act UE, le calendrier d\'application et la pyramide des risques (liens dans la section Ressources).',
      },
    ],
  },
  {
    category: 'Compte et accès',
    items: [
      {
        q: 'Comment créer un compte ?',
        a: 'Cliquez sur « S\'inscrire » depuis la page d\'accueil ou les tarifs. Une fois connecté, vous pourrez créer votre registre depuis le tableau de bord.',
      },
      {
        q: 'J\'ai une question commerciale (démo, presse, partenariat)',
        a: 'Utilisez la page Contact pour les demandes commerciales. Ce centre d\'aide traite l\'utilisation de la plateforme et le support produit.',
      },
    ],
  },
]

export type SupportFAQRole = 'owner' | 'collaborator' | 'public'

export function getSupportFaqSections(role: SupportFAQRole): SupportFAQSection[] {
  if (role === 'owner') return OWNER_SUPPORT_FAQ_SECTIONS
  if (role === 'collaborator') return COLLABORATOR_SUPPORT_FAQ_SECTIONS
  return PUBLIC_SUPPORT_FAQ_SECTIONS
}

export function buildSupportFaqPageJsonLd(sections: SupportFAQSection[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.flatMap((section) =>
      section.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      }))
    ),
  }
}
