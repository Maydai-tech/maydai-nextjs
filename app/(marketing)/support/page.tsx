import type { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Support MaydAI | Aide plateforme & conformité IA Act',
  description:
    'Contactez le support MaydAI pour toute question sur la plateforme, la réglementation IA Act, la formation ou votre abonnement.',
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
              Centre de support MaydAI
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-700">
              Une question sur la plateforme, la réglementation IA Act, la formation ou votre
              abonnement ? Notre équipe vous répond rapidement.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl lg:p-10">
            <ContactForm source="support_page" />
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            En nous contactant, vous acceptez notre{' '}
            <a href="/politique-confidentialite" className="text-[#0080a3] hover:underline">
              politique de confidentialité
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  )
}
