import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SIGNUP_AUDIT_HREF } from '../signup-audit-href'

export default function CtaFinalAudit() {
  return (
    <section className="py-16 md:py-24 px-5 sm:px-6 bg-gradient-to-br from-[#0080a3]/8 to-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-8 md:p-14 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            Prêt à sécuriser vos déploiements IA ?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Ne laissez pas l&apos;incertitude réglementaire freiner votre innovation. Rejoignez les entreprises qui font
            de la conformité un pilier de leur croissance.
          </p>
          <Link
            href={SIGNUP_AUDIT_HREF}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-[#0080a3] text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-[#006280] hover:shadow-xl transition-all duration-300"
          >
            Créer mon compte et lancer l&apos;audit
            <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
