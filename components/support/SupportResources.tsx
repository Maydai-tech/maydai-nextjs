import Link from 'next/link'
import { BookOpen, Calendar, FileText, Landmark, Scale, TriangleAlert } from 'lucide-react'

const RESOURCES = [
  {
    href: '/fonctionnalites',
    label: 'Documentation de la plateforme',
    description: 'Découvrez les fonctionnalités MaydAI pour gérer votre conformité IA Act.',
    icon: BookOpen,
  },
  {
    href: '/conformite-ia',
    label: 'Comprendre l\'IA Act',
    description: 'Les enjeux réglementaires et les étapes clés de la mise en conformité.',
    icon: Scale,
  },
  {
    href: '/ia-act-ue',
    label: 'Vue d\'ensemble IA Act UE',
    description: 'Guide complet du règlement européen : classification des risques et obligations.',
    icon: Landmark,
  },
  {
    href: '/ia-act-ue/calendrier',
    label: 'Calendrier IA Act',
    description: 'Échéances d\'application du règlement de 2025 à 2030.',
    icon: Calendar,
  },
  {
    href: '/ia-act-ue/risques',
    label: 'Pyramide risques IA',
    description: 'Les quatre niveaux de risque et leurs implications pour votre conformité.',
    icon: TriangleAlert,
  },
  {
    href: '/conditions-generales',
    label: 'Mentions légales',
    description: 'Conditions générales d\'utilisation et informations légales.',
    icon: FileText,
  },
] as const

export default function SupportResources() {
  return (
    <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">Ressources utiles</h2>
      <ul className="space-y-4">
        {RESOURCES.map(({ href, label, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:border-[#0080A3]/30 hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0080A3]/10 text-[#0080A3]">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-medium text-gray-900 group-hover:text-[#0080A3]">
                  {label}
                </span>
                <span className="mt-1 block text-sm text-gray-600">{description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
