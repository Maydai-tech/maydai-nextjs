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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-10 lg:gap-8 items-center justify-items-center">
      {securityLogos.map((logo) => (
        <div
          key={logo.label}
          className="flex flex-col items-center group transition-transform hover:scale-105"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 relative mb-2 grayscale group-hover:grayscale-0 transition-all duration-300">
            <Image
              src={logo.src}
              alt={logo.alt}
              fill
              sizes="80px"
              className="object-contain"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">{logo.label}</span>
        </div>
      ))}
    </div>
  )
}

