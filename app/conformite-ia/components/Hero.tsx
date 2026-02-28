import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 px-5 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0080a3]/5 via-white to-blue-50/50 -z-10" />

      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0080a3]/[0.04] rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl -z-10" />

      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-[#0080a3]/10 text-[#0080a3] text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0080a3] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0080a3]" />
          </span>
          AI Act en vigueur depuis février 2025
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
          Sécurisez et Optimisez vos{' '}
          <span className="text-[#0080a3]">projets IA</span> avec MaydAI
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
          La plateforme tout-en-un pour naviguer l&apos;AI Act et accélérer
          votre déploiement. Audit automatisé, gestion des risques et
          gouvernance IA en un seul outil.
        </p>

        {/* CTA group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0080a3] text-white font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:bg-[#006280] hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
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

        {/* Trust micro-copy */}
        <p className="mt-6 text-sm text-gray-400">
          Gratuit 14 jours &middot; Sans carte bancaire &middot; Hébergé en France
        </p>

        {/* Hero visual */}
        <div className="mt-12 md:mt-16 relative mx-auto max-w-4xl">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200/60">
            <Image
              src="/content/open_graph_maydai.png"
              alt="Tableau de bord MaydAI - Vue de la plateforme de conformité AI Act"
              width={1200}
              height={630}
              className="w-full h-auto"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 960px"
            />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/5 blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  )
}
