'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getProviderIcon } from '@/lib/provider-icons'

const MISTRAL_ICON = getProviderIcon('Mistral')

const MODELS = [
  {
    usage: 'Assistant IA conversationnel',
    model: 'mistral-large',
  },
  {
    usage: 'Résumé du cas d’usage',
    model: 'mistral-small',
  },
] as const

const TRUST_LOGOS = [
  { src: '/icons_sec/Webcloud_1.webp', label: 'OVHcloud' },
  { src: '/icons_sec/FR_Hosting.webp', label: 'France' },
  { src: '/icons_sec/ISOIEC_27001.webp', label: 'ISO 27001' },
  { src: '/icons_sec/Soc_2.webp', label: 'SOC 2' },
  { src: '/icons_sec/RGPD_Certif.webp', label: 'RGPD' },
] as const

export default function HubTrustFooter() {
  return (
    <section
      aria-labelledby="hub-trust-heading"
      className="mt-8 rounded-xl border border-slate-100 bg-white p-5 sm:mt-10 sm:p-6"
    >
      <h2 id="hub-trust-heading" className="sr-only">
        Technologies et hébergement des données
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">
            Technologies
          </h3>
          <ul className="space-y-3">
            {MODELS.map((item) => (
              <li key={item.model} className="flex items-center gap-3">
                <Image
                  src={MISTRAL_ICON}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <p className="font-sans text-sm font-medium text-slate-800">{item.usage}</p>
                  <p className="font-sans text-xs text-slate-500">{item.model}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wide text-slate-500">
            Données
          </h3>
          <p className="mb-3 font-sans text-sm text-slate-600">
            Vos données sont hébergées en France sur OVHcloud.
          </p>
          <ul
            className="mb-3 flex flex-wrap items-center gap-3 sm:gap-4"
            aria-label="Garanties de sécurité"
          >
            {TRUST_LOGOS.map((logo) => (
              <li key={logo.label} className="flex flex-col items-center gap-1">
                <div className="relative h-8 w-8 sm:h-9 sm:w-9">
                  <Image
                    src={logo.src}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-contain"
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {logo.label}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/securite"
            className="inline-flex min-h-11 items-center font-sans text-sm font-medium text-[#0080A3] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2"
          >
            En savoir plus
          </Link>
        </div>
      </div>
    </section>
  )
}
