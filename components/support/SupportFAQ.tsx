import Link from 'next/link'
import type { ReactNode } from 'react'
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
import {
  getSupportFaqSections,
  type SupportFAQItem,
  type SupportFAQRole,
  type SupportFAQSection,
} from '@/components/support/support-faq-data'

const FAQ_LINK_CLASS =
  'font-medium text-[#0080A3] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-1 rounded'

const SUPPORT_FAQ_SECTION_ICONS: Record<string, LucideIcon> = {
  "Cas d'usage et évaluation": Lightbulb,
  'Conformité et preuves (todos)': ShieldCheck,
  'Facturation et limites': CreditCard,
  'Compte et e-mail': UserCog,
  'Votre accès au registre': Key,
  Facturation: CreditCard,
  'Découvrir MaydAI': Search,
  'IA Act européen': Landmark,
  'Compte et accès': UserPlus,
}

type FAQSectionWithIcon = SupportFAQSection & {
  icon: LucideIcon
}

function withSectionIcons(sections: SupportFAQSection[]): FAQSectionWithIcon[] {
  return sections.map((section) => ({
    ...section,
    icon: SUPPORT_FAQ_SECTION_ICONS[section.category] ?? Search,
  }))
}

type SupportFAQProps = {
  role: SupportFAQRole
}

function renderFaqAnswer(item: SupportFAQItem, role: SupportFAQRole): ReactNode {
  if (role !== 'public') {
    return item.a
  }

  switch (item.q) {
    case 'Comment créer un compte ?':
      return (
        <>
          Cliquez sur « S&apos;inscrire » depuis la{' '}
          <Link href="/" className={FAQ_LINK_CLASS}>
            page d&apos;accueil
          </Link>{' '}
          ou les{' '}
          <Link href="/tarifs" className={FAQ_LINK_CLASS}>
            tarifs
          </Link>
          . Une fois connecté, vous pourrez créer votre registre depuis le tableau de bord.
        </>
      )
    case 'J\'ai une question commerciale (démo, presse, partenariat)':
      return (
        <>
          Utilisez la{' '}
          <Link href="/contact" className={FAQ_LINK_CLASS}>
            page Contact
          </Link>{' '}
          pour les demandes commerciales. Ce centre d&apos;aide traite l&apos;utilisation de la
          plateforme et le support produit.
        </>
      )
    default:
      return item.a
  }
}

export default function SupportFAQ({ role }: SupportFAQProps) {
  const subtitle =
    role === 'owner'
      ? 'Propriétaire du registre — cas d\'usage, todos, facturation et collaboration.'
      : role === 'collaborator'
        ? 'Collaborateur — accès aux dossiers, todos et bonnes pratiques.'
        : 'Questions pour découvrir MaydAI avant de créer un compte.'

  const faqSections = withSectionIcons(getSupportFaqSections(role))

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
                  <p className="text-sm leading-relaxed text-slate-600">
                    {renderFaqAnswer(item, role)}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )
      })}
    </div>
  )
}
