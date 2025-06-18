import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary-light to-primary-dark text-white py-20 px-4 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="max-w-2xl mx-auto z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
          MaydAI : Votre partenaire pour l'<span className="text-primary-light">Audit AI Act</span> et la conformité réglementaire IA
        </h1>
        <p className="text-lg md:text-xl mb-8 font-medium">
          Simplifiez et sécurisez la conformité de vos systèmes d'IA avec MaydAI. Notre solution vous accompagne à chaque étape de l'Audit AI Act, pour une conformité rapide, fiable et transparente.
        </p>
        <Link href="/login" className="inline-block bg-white text-primary font-bold px-8 py-3 rounded-lg shadow-lg hover:bg-gray-100 transition">
          Démarrer l'Audit AI Act
        </Link>
      </div>
      {/* Illustration ou image décorative */}
      <img src="#" alt="Illustration conformité IA" className="absolute right-8 bottom-0 w-40 md:w-64 opacity-30 pointer-events-none select-none" />
    </section>
  );
} 