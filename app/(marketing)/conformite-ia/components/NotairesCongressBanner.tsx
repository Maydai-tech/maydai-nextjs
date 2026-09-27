import Image from 'next/image'

/** Retrait du bandeau le 16 octobre 2026 à minuit, heure de Paris (visible jusqu'au 15 octobre inclus). */
const EVENT_ENDS_AT = Date.parse('2026-10-16T00:00:00+02:00')

export default function NotairesCongressBanner() {
  if (Date.now() >= EVENT_ENDS_AT) return null

  return (
    <aside
      className="mx-auto mb-10 max-w-3xl rounded-2xl border border-[#0080a3]/15 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5"
      aria-label="MaydAI au 122e Congrès des Notaires de France, stand H17"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <Image
          src="/logos/congres-notaires-122.jpg"
          alt="122e Congrès des Notaires de France — Le notaire et l'impôt. Notaires de France."
          width={669}
          height={269}
          className="h-auto w-full max-w-[280px] shrink-0 sm:max-w-[240px]"
          sizes="240px"
        />

        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0080a3] sm:text-sm">
            Lille · 30 septembre au 2 octobre
          </p>
          <p className="mt-1 text-base font-extrabold leading-snug text-gray-900 sm:text-lg">
            MaydAI sera présent au 122<sup>e</sup> Congrès des Notaires de France
          </p>
          <p className="mt-2">
            <span className="inline-flex items-center rounded-full bg-[#0080a3] px-3 py-1 text-sm font-bold text-white">
              Stand H17
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
            Venez échanger avec nos experts au stand H17 : de la déclaration
            de vos cas d&apos;usage à leur documentation, nous vous accompagnons
            pas à pas vers une IA conforme et sécurisée.
          </p>
        </div>
      </div>
    </aside>
  )
}
