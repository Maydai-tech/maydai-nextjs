import Image from 'next/image'

export default function HeroEco() {
  return (
    <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-20 px-4 flex flex-col items-center justify-center text-center min-h-[60vh] overflow-hidden">
      <div className="max-w-2xl mx-auto z-10">
        <h1 className="font-sans text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4 text-center">
          Impact Environnemental IA : Mesurez l&apos;empreinte de vos systèmes
        </h1>
        <p className="text-lg text-white/90 max-w-2xl mx-auto mt-4 text-center">
          Avant de déployer vos applications, évaluer l&apos;
          <strong className="font-semibold text-white">impact environnemental IA</strong> de vos
          modèles est devenu indispensable. Notre simulateur vous permet d&apos;analyser
          l&apos;empreinte écologique et la consommation énergétique de vos cas d&apos;usage afin
          d&apos;adopter une démarche de Green IT. Comparez vos architectures logicielles pour
          piloter efficacement l&apos;
          <strong className="font-semibold text-white">impact environmental IA</strong> de vos
          infrastructures.
        </p>
      </div>
      <Image
        src="/content/compliance-ai-eu.webp"
        alt=""
        width={256}
        height={256}
        className="absolute right-8 bottom-0 w-40 md:w-64 h-auto opacity-30 pointer-events-none select-none"
        priority
        sizes="(max-width: 768px) 160px, 256px"
        aria-hidden
      />
    </section>
  )
}
