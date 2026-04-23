import Image from 'next/image'

const securityLogos = [
  {
    src: '/icons_sec/ISOIEC_27001.webp',
    alt: "ISO/IEC 27001 - Sécurité de l'information",
    label: 'ISO 27001',
  },
  {
    src: '/icons_sec/Soc_1.webp',
    alt: 'SOC 1 Type II - Contrôles financiers',
    label: 'SOC 1',
  },
  {
    src: '/icons_sec/Soc_2.webp',
    alt: 'SOC 2 Type II - Contrôles de sécurité',
    label: 'SOC 2',
  },
  {
    src: '/icons_sec/RGPD_Certif.webp',
    alt: 'RGPD - Conformité européenne',
    label: 'RGPD',
  },
  {
    src: '/icons_sec/Webcloud_1.webp',
    alt: 'OVHcloud - Hébergeur européen',
    label: 'OVHcloud',
  },
  {
    src: '/icons_sec/FR_Hosting.webp',
    alt: 'Hébergé en France - Souveraineté des données',
    label: 'France',
  },
] as const

export default function SecurityLogosGrid() {
  return (
    <div className="grid w-full max-w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-4 items-center justify-items-center">
      {securityLogos.map((logo) => (
        <div
          key={logo.label}
          className="flex flex-col items-center group transition-transform hover:scale-105"
        >
          <div className="relative mb-1.5 h-10 w-10 sm:h-12 sm:w-12 grayscale transition-all duration-300 group-hover:grayscale-0">
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="(max-width: 640px) 40px, 48px"
              className="object-contain"
            />
          </div>
          <span className="text-[11px] font-medium leading-tight text-gray-500 sm:text-xs">
            {logo.label}
          </span>
        </div>
      ))}
    </div>
  )
}

