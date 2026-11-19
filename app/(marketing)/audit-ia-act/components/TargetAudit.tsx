import { UserCheck, Scale, Cpu } from 'lucide-react'

const targets = [
  {
    icon: UserCheck,
    title: 'Pour les DPO & Responsables Privacy',
    body:
      "Centralisez la gouvernance de l'IA à côté de vos registres RGPD et assurez une protection des données by design.",
  },
  {
    icon: Scale,
    title: 'Pour les Directeurs Juridiques',
    body:
      'Traduisez la complexité du règlement européen en exigences claires et vérifiables pour vos contrats et audits internes.',
  },
  {
    icon: Cpu,
    title: 'Pour les CTO & DSI',
    body:
      'Innovez en toute sécurité. Validez la conformité technique de vos modèles avant leur mise en production pour éviter tout legacy réglementaire.',
  },
] as const

export default function TargetAudit() {
  return (
    <section className="py-16 md:py-20 px-5 sm:px-6 bg-gradient-to-br from-[#0080a3]/5 to-blue-50/80 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 text-center mb-12 md:mb-14 leading-tight">
          Une plateforme conçue pour les experts du digital
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {targets.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-7 flex flex-col h-full"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#0080a3] text-white mb-4">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed flex-1">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
