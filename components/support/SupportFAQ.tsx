import {
  ChevronDown,
  CreditCard,
  Key,
  Landmark,
  Lightbulb,
  Search,
  ShieldCheck,
  UserCog,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'

type FAQSection = {
  category: string
  icon: LucideIcon
  items: { q: string; a: string }[]
}

const ownerFAQ: FAQSection[] = [
  {
    category: "Cas d'usage et évaluation",
    icon: Lightbulb,
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
    icon: ShieldCheck,
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
    icon: CreditCard,
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
    icon: UserCog,
    items: [
      {
        q: 'Comment demander un changement d\'adresse e-mail ?',
        a: 'Utilisez le formulaire ci-dessus (motif « Compte — changement d\'email ») ou la procédure dans la section suivante.',
      },
    ],
  },
]

const collaboratorFAQ: FAQSection[] = [
  {
    category: 'Votre accès au registre',
    icon: Key,
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
    icon: Lightbulb,
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
    icon: ShieldCheck,
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
    icon: CreditCard,
    items: [
      {
        q: 'Comment modifier l\'abonnement ou les limites du registre ?',
        a: 'La gestion de l\'abonnement est réservée au propriétaire. Adressez-vous à lui ou utilisez le formulaire support pour signaler un blocage lié aux limites.',
      },
    ],
  },
  {
    category: 'Compte et e-mail',
    icon: UserCog,
    items: [
      {
        q: 'Comment changer mon adresse e-mail de connexion ?',
        a: 'Utilisez le formulaire ci-dessus (motif « Compte — changement d\'email »). Cela concerne votre compte personnel, pas celui du propriétaire du registre.',
      },
    ],
  },
]

const publicFAQ: FAQSection[] = [
  {
    category: 'Découvrir MaydAI',
    icon: Search,
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
    icon: Landmark,
    items: [
      {
        q: 'Où comprendre les échéances et les niveaux de risque ?',
        a: 'Consultez nos pages IA Act UE, le calendrier d\'application et la pyramide des risques (liens dans la section Ressources).',
      },
    ],
  },
  {
    category: 'Compte et accès',
    icon: UserPlus,
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

type SupportFAQProps = {
  role: 'owner' | 'collaborator' | 'public'
}

export default function SupportFAQ({ role }: SupportFAQProps) {
  const subtitle =
    role === 'owner'
      ? 'Propriétaire du registre — cas d\'usage, todos, facturation et collaboration.'
      : role === 'collaborator'
        ? 'Collaborateur — accès aux dossiers, todos et bonnes pratiques.'
        : 'Questions pour découvrir MaydAI avant de créer un compte.'

  const faqSections =
    role === 'owner' ? ownerFAQ : role === 'collaborator' ? collaboratorFAQ : publicFAQ

  const headingId = role === 'public' ? 'public-faq-heading' : 'support-faq-heading'

  return (
    <div>
      <h2 id={headingId} className="mb-1 font-sans text-xl font-bold text-slate-900">
        FAQ — Questions fréquentes
      </h2>
      <p className="mb-6 text-sm text-slate-500">{subtitle}</p>

      {faqSections.map((section) => {
        const CategoryIcon = section.icon

        return (
          <div key={section.category}>
            <div className="mb-4 mt-8 flex items-center gap-2 first:mt-6">
              <CategoryIcon
                className="h-4 w-4 shrink-0 text-[#0080A3]"
                aria-hidden="true"
              />
              <h3 className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {section.category}
              </h3>
            </div>

            {section.items.map((item) => (
              <details
                key={`${section.category}-${item.q}`}
                className="group mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0080A3] sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <ChevronDown
                    className="ml-4 h-5 w-5 shrink-0 text-[#0080A3] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
                  <p className="text-sm leading-relaxed text-slate-600">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        )
      })}
    </div>
  )
}
