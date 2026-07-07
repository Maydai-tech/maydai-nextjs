import Image from 'next/image'

const logos = [
  { src: '/logos/logo-institut/eu_ai_act_logo_main.png', alt: 'EU AI Act' },
  { src: '/logos/logo-institut/compl---ai.png', alt: 'Compl AI' },
  { src: '/logos/logo-institut/ai-forensics.png', alt: 'AI Forensics' },
  { src: '/logos/logo-institut/eth.png', alt: 'ETH Zurich' },
  { src: '/logos/logo-institut/logo-part1-en-green.png', alt: 'Future of Life Institute' },
]

export default function TrustLogos() {
  return (
    <section className="py-12 md:py-16 px-5 sm:px-6 bg-gray-50 border-y border-gray-100">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
          Ils contribuent à façonner une IA responsable
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-16">
          {logos.map((logo) => (
            <div key={logo.alt} className="relative flex-shrink-0 w-[120px] h-10 md:h-12">
              <Image
                src={logo.src}
                alt={logo.alt}
                fill
                sizes="120px"
                className="object-contain grayscale opacity-50 hover:opacity-90 hover:grayscale-0 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
