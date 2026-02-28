import { Lock, ShieldCheck, Server } from 'lucide-react'

const points = [
  {
    icon: Server,
    title: 'Hébergement 100% français',
    description:
      'Vos données sont stockées exclusivement en France chez OVHcloud (Gravelines / Roubaix). Aucun transit via des serveurs soumis au Cloud Act américain.',
  },
  {
    icon: Lock,
    title: 'Chiffrement de bout en bout',
    description:
      'Communications chiffrées en HTTPS/TLS 1.3, données sensibles chiffrées au repos. Sauvegardes quotidiennes répliquées sur plusieurs sites.',
  },
  {
    icon: ShieldCheck,
    title: 'Conformité RGPD garantie',
    description:
      'Vos données vous appartiennent. Export et suppression à tout moment. Aucune utilisation pour l\'entraînement de modèles sans consentement explicite.',
  },
]

export default function Security() {
  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Une infrastructure{' '}
            <span className="text-[#0080a3]">blindée</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Souveraineté des données, certifications internationales et
            transparence totale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {points.map((point) => {
            const Icon = point.icon
            return (
              <div
                key={point.title}
                className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-3 bg-[#0080a3]/10 rounded-xl w-fit mb-5">
                  <Icon className="w-7 h-7 text-[#0080a3]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {point.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {point.description}
                </p>
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap justify-center items-center gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-[#0080a3]" />
            ISO 27001
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-[#0080a3]" />
            SOC 2 Type II
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-[#0080a3]" />
            RGPD
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            <Server className="w-4 h-4 text-[#0080a3]" />
            OVHcloud France
          </span>
        </div>
      </div>
    </section>
  )
}
