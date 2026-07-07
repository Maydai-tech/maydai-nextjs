import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { sendLandingCtaClick } from '@/lib/gtm'
import { SIGNUP_HREF } from '@/lib/signup-utm-hrefs'

export default function LandingFooter() {
  const handleFooterFreeTrialClick = () => {
    sendLandingCtaClick({
      button_intent: 'essai_gratuit',
      button_location: 'footer',
    })
  }

  const handleFooterDemoClick = () => {
    sendLandingCtaClick({
      button_intent: 'demande_demo',
      button_location: 'footer',
    })
  }

  return (
    <footer className="bg-white">
      {/* Final CTA */}
      <section className="py-16 md:py-24 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#0080a3]/5 to-blue-50 rounded-3xl p-8 md:p-14 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Prêt à sécuriser vos projets IA ?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Rejoignez les entreprises qui font confiance à MaydAI pour leur
              conformité AI Act. Commencez gratuitement, sans engagement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={SIGNUP_HREF.conformite_ia}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0080a3] text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-[#006280] hover:shadow-xl transition-all duration-300"
                onClick={handleFooterFreeTrialClick}
              >
                Démarrer l&apos;essai gratuit
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold text-lg px-8 py-4 rounded-full border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-300"
                onClick={handleFooterDemoClick}
              >
                Demander une démo
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6">
              Premier registre gratuit &middot; Sans carte bancaire &middot; Hébergé en France
            </p>
          </div>
        </div>
      </section>

    </footer>
  )
}
