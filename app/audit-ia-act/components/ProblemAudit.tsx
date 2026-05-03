import { CalendarClock, AlertTriangle, ShieldAlert } from 'lucide-react'

const blocks = [
  {
    icon: CalendarClock,
    title: 'Un calendrier réglementaire en marche',
    body:
      "L'AI Act n'est plus un projet, c'est une réalité. Le décompte est lancé pour la mise en conformité de vos systèmes. Réaliser un audit maintenant, c'est garantir la continuité de vos opérations sans risquer une interruption brutale de vos services.",
  },
  {
    icon: AlertTriangle,
    title: "Sortez de l'incertitude sur les Hauts Risques",
    body:
      'Tous les systèmes d\'IA ne se valent pas. Notre audit identifie précisément si vos cas d\'usage tombent dans la catégorie « Haut Risque », nécessitant une documentation technique et une gouvernance ultra-rigoureuse selon les standards européens.',
  },
  {
    icon: ShieldAlert,
    title: 'Protégez votre entreprise des sanctions',
    body:
      "Avec des amendes pouvant atteindre 7 % du chiffre d'affaires mondial, la non-conformité est un risque financier majeur. Un audit proactif est votre meilleure assurance pour transformer une contrainte légale en un avantage compétitif sécurisé.",
  },
] as const

export default function ProblemAudit() {
  return (
    <section className="py-16 md:py-20 px-5 sm:px-6 bg-gray-50 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-12 md:mb-14 leading-tight">
          Pourquoi réaliser un audit IA Act dès aujourd&apos;hui ?
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {blocks.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 flex flex-col"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#0080a3]/10 text-[#0080a3] mb-4">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base flex-1">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
