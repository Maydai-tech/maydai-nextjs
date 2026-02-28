import { ShieldCheck, Zap, Building2 } from 'lucide-react'

const features = [
  {
    icon: ShieldCheck,
    title: 'Conformité AI Act',
    description:
      'Évaluez automatiquement le niveau de risque de vos systèmes d\'IA selon les critères de l\'AI Act européen. Générez des rapports d\'audit prêts pour les régulateurs.',
    highlights: ['Classification des risques', 'Rapports d\'audit', 'Checklist réglementaire'],
  },
  {
    icon: Zap,
    title: 'Optimisation & Accélération',
    description:
      'Gagnez des semaines sur votre mise en conformité grâce à nos questionnaires intelligents et notre accompagnement par IA. Passez de l\'audit au plan d\'action en quelques clics.',
    highlights: ['Questionnaires guidés', 'Scoring automatique', 'Plans de remédiation'],
  },
  {
    icon: Building2,
    title: 'Gouvernance & Registre IA',
    description:
      'Centralisez tous vos cas d\'usage IA dans un registre unique. Suivez l\'état de conformité de chaque projet et luttez contre le shadow AI dans votre organisation.',
    highlights: ['Registre centralisé', 'Suivi en temps réel', 'Mode collaboratif'],
  },
]

export default function Features() {
  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Tout ce qu&apos;il faut pour{' '}
            <span className="text-[#0080a3]">naviguer l&apos;AI Act</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Une plateforme conçue pour les entreprises qui veulent déployer
            l&apos;IA de manière responsable et conforme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="p-3 bg-[#0080a3]/10 rounded-xl flex-shrink-0">
                    <Icon className="w-7 h-7 text-[#0080a3]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {feature.title}
                  </h3>
                </div>

                <p className="text-gray-600 leading-relaxed mb-6 flex-1">
                  {feature.description}
                </p>

                <ul className="space-y-2">
                  {feature.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0080a3] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
