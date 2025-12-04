// components/EngagementsBanner.jsx

import Image from 'next/image';

// Listez ici les noms de vos fichiers de logo
const logos = [
  'logo-cnrs.svg', // Remplacez par vos vrais noms de fichier
  'logo-inria.svg',
  'logo-cea.svg',
  'logo-institut-pasteur.svg',
  'logo-universite-psl.svg',
  'logo-polytechnique.svg',
];

const EngagementsBanner = () => {
  // Pour un défilement fluide et infini, nous dupliquons la liste des logos.
  const extendedLogos = [...logos, ...logos];

  return (
    <section className="py-12 bg-white sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 sm:text-3xl lg:text-4xl">
          Façonner l'IA en Europe : Nos Engagements pour une Technologie à Visage Humain.
        </h2>

        <div className="relative mt-12 overflow-hidden">
          {/* Le conteneur qui défile */}
          <div className="flex animate-infinite-scroll">
            {extendedLogos.map((logo, index) => (
              <div key={index} className="flex-shrink-0 mx-6 lg:mx-8">
                <Image
                  src={`/logos/institut/${logo}`} // Assurez-vous que le chemin est correct
                  alt={`Logo partenaire ${index + 1}`}
                  width={140}
                  height={48}
                  className="object-contain filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              </div>
            ))}
          </div>
          {/* Voile sur les côtés pour un effet de fondu (optionnel mais recommandé) */}
          <div className="absolute top-0 left-0 w-16 h-full bg-gradient-to-r from-white to-transparent"></div>
          <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-white to-transparent"></div>
        </div>
      </div>
    </section>
  );
};

export default EngagementsBanner;