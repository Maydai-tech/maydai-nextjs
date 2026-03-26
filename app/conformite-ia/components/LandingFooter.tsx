import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function LandingFooter() {
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
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0080a3] text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-[#006280] hover:shadow-xl transition-all duration-300"
              >
                Démarrer l&apos;essai gratuit
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold text-lg px-8 py-4 rounded-full border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-300"
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

      {/* Minimal legal footer */}
      <div className="border-t border-gray-100 py-6 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="relative w-[100px] h-6">
              <Image
                src="/logos/logo-maydai/logo-maydai-complet.png"
                alt="MaydAI"
                fill
                sizes="100px"
                className="object-contain object-left"
              />
            </div>
          </Link>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link
              href="/politique-confidentialite"
              className="hover:text-[#0080a3] transition-colors"
            >
              Confidentialité
            </Link>
            <Link
              href="/conditions-generales"
              className="hover:text-[#0080a3] transition-colors"
            >
              CGU
            </Link>
            <Link
              href="/securite"
              className="hover:text-[#0080a3] transition-colors"
            >
              Sécurité
            </Link>
            <Link
              href="/contact"
              className="hover:text-[#0080a3] transition-colors"
            >
              Contact
            </Link>
          </nav>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MaydAI
          </p>
        </div>
      </div>
    </footer>
  )
}
