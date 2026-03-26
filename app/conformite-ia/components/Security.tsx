import Image from 'next/image'
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
            <span className="text-[#0080a3]">sécurisée</span>
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

        {/* Trust badges - logos de certification */}
        <div className="mt-14 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            Nos garanties de sécurité
          </h3>
          <div className="relative w-full max-w-[640px] h-[80px] mx-auto">
            <Image
              src="/images/security-badges.png"
              alt="Certifications de sécurité : ISO 27001, SOC 2 Type II, RGPD, OVHcloud, hébergement France"
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-contain"
            />
          </div>
          <p className="mt-6 text-gray-600 text-sm sm:text-base italic max-w-2xl mx-auto">
            MaydAI repose sur l&apos;infrastructure OVHcloud certifiée selon les
            normes internationales les plus strictes.
          </p>
        </div>
      </div>
    </section>
  )
}
