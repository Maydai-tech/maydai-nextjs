import Image from 'next/image'

const securityLogos = [
  {
    src: '/icons_sec/ISOIEC_27001.webp',
    label: 'ISO 27001',
  },
  {
    src: '/icons_sec/Soc_1.webp',
    label: 'SOC 1',
  },
  {
    src: '/icons_sec/Soc_2.webp',
    label: 'SOC 2',
  },
  {
    src: '/icons_sec/RGPD_Certif.webp',
    label: 'RGPD',
  },
  {
    src: '/icons_sec/Webcloud_1.webp',
    label: 'OVHcloud',
  },
  {
    src: '/icons_sec/FR_Hosting.webp',
    label: 'France',
  },
] as const

export default function SecurityLogosGrid() {
  return (
    <ul
      role="list"
      aria-label="Nos certifications et garanties de sécurité"
      className="list-none grid w-full max-w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-4 items-center justify-items-center m-0 p-0 opacity-80 transition-opacity hover:opacity-100"
    >
      {securityLogos.map((logo) => (
        <li
          key={logo.label}
          className="flex flex-col items-center gap-1 group transition-transform hover:scale-105"
        >
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 shrink-0 grayscale transition-all duration-300 group-hover:grayscale-0">
            <Image
              src={logo.src}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 40px, 48px"
              className="object-contain"
            />
          </div>
          <span className="text-center text-xs font-semibold uppercase leading-tight tracking-wider text-slate-500">
            {logo.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

