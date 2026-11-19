import Image from 'next/image'

const certifications = [
  {
    src: '/icons_sec/ISOIEC_27001.webp',
    label: 'ISO 27001',
    width: 262,
    height: 300,
  },
  {
    src: '/icons_sec/Soc_1.webp',
    label: 'SOC 1',
    width: 328,
    height: 300,
  },
  {
    src: '/icons_sec/RGPD_Certif.webp',
    label: 'RGPD',
    width: 206,
    height: 187,
  },
  {
    src: '/icons_sec/FR_Hosting.webp',
    label: 'Hébergé en France',
    width: 243,
    height: 237,
  },
]

function starPoints(cx, cy, outer, inner) {
  const points = []
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`)
  }
  return points.join(' ')
}

function FranceFlag() {
  return (
    <svg viewBox="0 0 3 2" className="h-8 w-12 rounded-sm border border-slate-200" aria-hidden>
      <rect width="1" height="2" fill="#0055A4" />
      <rect x="1" width="1" height="2" fill="#FFFFFF" />
      <rect x="2" width="1" height="2" fill="#EF4135" />
    </svg>
  )
}

function EuropeFlag() {
  const stars = Array.from({ length: 12 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 6
    return {
      cx: 30 + Math.cos(angle) * 9.5,
      cy: 20 + Math.sin(angle) * 9.5,
    }
  })

  return (
    <svg viewBox="0 0 60 40" className="h-8 w-12 rounded-sm border border-slate-200" aria-hidden>
      <rect width="60" height="40" fill="#003399" />
      {stars.map((star) => (
        <polygon
          key={`${star.cx}-${star.cy}`}
          fill="#FFCC00"
          points={starPoints(star.cx, star.cy, 1.7, 0.7)}
        />
      ))}
    </svg>
  )
}

const mistralMarks = [
  { key: 'france', label: 'France', Flag: FranceFlag },
  { key: 'europe', label: 'Europe', Flag: EuropeFlag },
]

export default function SovereignTechSection() {
  return (
    <section
      aria-labelledby="sovereign-tech-heading"
      className="bg-white px-4 py-12 md:py-16"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="sovereign-tech-heading"
          className="mx-auto mb-8 max-w-3xl text-center text-lg font-bold leading-snug text-gray-900 sm:text-xl md:mb-10 md:text-2xl"
        >
          La plateforme MaydAI utilise des technologies souveraines, européennes et françaises
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <Image
              src="/logos/ovhcloud.svg"
              alt="OVHcloud"
              width={298}
              height={47}
              unoptimized
              className="h-8 w-auto max-w-[200px]"
            />
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Hébergement des données sécurisé
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
              Vos données sont hébergées en France sur OVHcloud, une
              infrastructure européenne sécurisée.
            </p>
            <ul
              className="mt-auto flex flex-wrap items-end gap-4 pt-5"
              aria-label="Certifications de sécurité OVHcloud"
            >
              {certifications.map((logo) => (
                <li key={logo.label} className="flex flex-col items-center gap-1">
                  <Image
                    src={logo.src}
                    alt=""
                    aria-hidden
                    width={logo.width}
                    height={logo.height}
                    className="h-10 w-10 object-contain"
                  />
                  <span className="max-w-[5.5rem] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                    {logo.label}
                  </span>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Image
                src="/icons_providers/mistral.svg"
                alt=""
                aria-hidden
                width={256}
                height={233}
                unoptimized
                className="h-10 w-10 shrink-0"
              />
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Mistral AI
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">
              Une IA européenne et sécurisée
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
              MaydAI repose sur Mistral AI, une intelligence artificielle
              européenne et sécurisée.
            </p>
            <ul
              className="mt-auto flex flex-wrap items-end gap-4 pt-5"
              aria-label="Origine de Mistral AI"
            >
              {mistralMarks.map(({ key, label, Flag }) => (
                <li key={key} className="flex flex-col items-center gap-1">
                  <Flag />
                  <span className="max-w-[5.5rem] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
