import { Map, Gauge, Route } from 'lucide-react'

const steps = [
  {
    icon: Map,
    title: "1. Cartographie de vos systèmes et cas d'usage",
    body:
      "La première étape consiste à recenser l'ensemble des systèmes d'IA utilisés ou développés au sein de votre organisation. Nous vous aidons à bâtir un inventaire exhaustif pour une visibilité totale sur votre stack technologique.",
  },
  {
    icon: Gauge,
    title: '2. Évaluation et Scoring des niveaux de risque',
    body:
      "Grâce à notre moteur d'analyse, chaque outil est classé selon la pyramide des risques de l'IA Act : du risque minime au risque inacceptable. Vous comprenez instantanément quelles obligations s'appliquent à chaque projet.",
  },
  {
    icon: Route,
    title: '3. Roadmap de mise en conformité',
    body:
      "Ne restez pas avec des questions sans réponses. À l'issue de l'audit, vous obtenez un plan d'action priorisé pour corriger les écarts de conformité, impliquer vos parties prenantes (DPO, Juridique, Tech) et valider vos déploiements.",
  },
] as const

export default function ProcessAudit() {
  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-12 md:mb-16 leading-tight">
          Les 3 étapes de votre diagnostic de conformité IA
        </h2>
        <ol className="space-y-10 md:space-y-12">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="flex flex-col sm:flex-row gap-5 sm:gap-8 items-start rounded-2xl border border-gray-100 bg-gray-50/50 p-6 md:p-8 shadow-sm"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0080a3] text-white font-extrabold text-lg shadow-md">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <Icon className="h-6 w-6 text-[#0080a3] shrink-0" aria-hidden />
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
