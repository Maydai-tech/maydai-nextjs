import type { Metadata } from 'next'
import ContactForm from '@/components/contact/ContactForm'
import SupportFAQ from '@/components/support/SupportFAQ'
import SupportFAQStructuredData from '@/components/support/SupportFAQStructuredData'
import SupportResources from '@/components/support/SupportResources'
import UrgentContact from '@/components/support/UrgentContact'

export const metadata: Metadata = {
  title: 'Support MaydAI | Aide plateforme & conformité IA Act',
  description:
    'Contactez le support MaydAI pour toute question sur la plateforme, la réglementation IA Act, la formation ou votre abonnement.',
  alternates: {
    canonical: 'https://www.maydai.io/support',
  },
  openGraph: {
    title: 'Support MaydAI | Aide plateforme & conformité IA Act',
    description:
      'Contactez le support MaydAI pour toute question sur la plateforme, la réglementation IA Act, la formation ou votre abonnement.',
    url: 'https://www.maydai.io/support',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MaydAI',
    images: [
      {
        url: '/content/open_graph_maydai.png',
        width: 1200,
        height: 630,
        alt: 'MaydAI - Support et aide plateforme IA Act',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support MaydAI | Aide plateforme & conformité IA Act',
    description:
      'Contactez le support MaydAI pour toute question sur la plateforme, la réglementation IA Act, la formation ou votre abonnement.',
    images: ['/content/open_graph_maydai.png'],
  },
}

export default function SupportPage() {
  return (
    <>
      <SupportFAQStructuredData role="public" />
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

          <div className="space-y-12">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl lg:p-10">
              <ContactForm source="support_page" />
            </div>

            <section aria-labelledby="public-faq-heading" className="mb-12 w-full">
              <SupportFAQ role="public" />
            </section>

            <SupportResources />
            <UrgentContact />
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
    </>
  )
}
