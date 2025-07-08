import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-20 px-4 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="max-w-2xl mx-auto z-10">
        <h1 className="hero-title font-extrabold mb-6 leading-tight" 
            style={{ 
              fontSize: '36px',
            }}>
          MaydAI : <span style={{ color: '#ffab5a' }}>plateforme de conformité AI Act</span> qui vous accompagne dans vos Audits IA
        </h1>
        <style dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 768px) {
              .hero-title {
                font-size: 42px !important;
              }
            }
          `
        }} />
        <p className="text-lg md:text-xl mb-8 font-medium">
          Simplifiez et sécurisez la conformité de vos systèmes d&apos;IA avec MaydAI. Notre solution vous accompagne à chaque étape de l&apos;Audit AI Act, pour une conformité rapide, fiable et transparente.
        </p>
        <Link href="/contact" className="inline-block bg-white text-primary font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition">
          Démarrer l&apos;Audit AI Act
        </Link>
      </div>
      {/* Logo conformité IA - Optimisé pour LCP */}
      <Image 
        src="/content/compliance-ai-eu.webp" 
        alt="Logo conformité IA" 
        width={256}
        height={256}
        className="absolute right-8 bottom-0 w-40 md:w-64 opacity-30 pointer-events-none select-none"
        priority
        sizes="(max-width: 768px) 160px, 256px"
      />
    </section>
  );
} 