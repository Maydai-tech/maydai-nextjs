import { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "Agenda IA Act : Le Calendrier Complet des Échéances 2025-2030",
  description: "Découvrez le calendrier détaillé et l'agenda complet de l'AI Act. Suivez les dates clés et les obligations pour les entreprises et les modèles d'IA."
};

export default function IaActAgendaPage() {
  const timelineData = [
    {
      date: "1er août 2024",
      title: "Acte I, Scène 1 : Le Lever de Rideau",
      description: "Ce jour-là, le rideau s'est levé sur une pièce un peu folle : l'AI Act. L'Europe, en bonne mère de famille soucieuse, a officiellement donné le coup d'envoi à son épopée administrative. C'est ici que le calendrier de la mise au pas de nos créatures de silicium a été figé, que la promesse de leur apprendre les bonnes manières a été gravée dans le marbre du Journal Officiel."
    },
    {
      date: "2 février 2025",
      title: "Fin des usages inacceptables",
      description: "L'Europe siffle la fin de la partie pour les manipulations subliminales, l'exploitation des faibles et la notation sociale par les États. Un grand ménage de printemps réglementaire."
    },
    {
      date: "2 mai 2025",
      title: "Arrivée des codes de bonne pratique",
      description: "Les fameux « codes de bonne pratique » arrivent, agissant comme un guide de savoir-vivre pour les cerveaux numériques les plus puissants, afin d'encadrer leur développement."
    },
    {
      date: "2 août 2025",
      title: "Le Grand Rendez-vous : Gouvernance et Transparence",
      description: "Les États membres doivent mettre en place leurs autorités de surveillance. Les fournisseurs de modèles d'IA à usage général (GPAI) doivent fournir une documentation technique, respecter les droits d'auteur et publier un résumé de leurs données d'entraînement."
    },
    {
      date: "2 août 2026",
      title: "Le Grand Jour de la Responsabilité",
      description: "La majorité des dispositions de l'AI Act deviennent la norme. Les systèmes d'IA « à haut risque » doivent se conformer à des exigences strictes et les « bacs à sable réglementaires » doivent être opérationnels."
    },
    {
      date: "2027 & 2030",
      title: "Le Temps des Règlements de Comptes",
      description: "Dernières échéances pour le grand rattrapage. Les systèmes à haut risque déjà sur le marché et les grands systèmes informatiques publics devront, eux aussi, se plier à la règle commune."
    }
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* En-tête de la page */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center bg-[#0080a3]/10 dark:bg-[#0080a3]/20 text-[#0080a3] dark:text-[#0080a3] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Image 
              src="/icons/calendar.png" 
              alt="Calendar" 
              width={16} 
              height={16} 
              className="mr-2"
            />
            Calendrier IA Act
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            L'Agenda de l'AI Act
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Ah, nous y sommes. À la veille du grand rendez-vous. Voilà un an que le grand ballet de l'AI Act a commencé et que les entreprises européennes se préparent à cette révolution réglementaire. Découvrez les dates clés qui transformeront le paysage de l'intelligence artificielle.
          </p>
        </section>

        {/* Timeline Container */}
        <section className="relative max-w-5xl mx-auto">
          {/* Ligne verticale centrale - cachée sur mobile */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-[#0080a3] transform -translate-x-px rounded-full"></div>
          
          {/* Ligne verticale mobile - visible seulement sur mobile */}
          <div className="md:hidden absolute left-8 top-0 bottom-0 w-1 bg-[#0080a3] rounded-full"></div>

          {/* Éléments de la timeline */}
          <div className="space-y-16 md:space-y-24">
            {timelineData.map((event, index) => (
              <article 
                key={index}
                className={`relative flex items-center ${
                  index % 2 === 0 
                    ? 'md:justify-start' 
                    : 'md:justify-end'
                }`}
              >
                {/* Point de la timeline - Desktop */}
                <div className="hidden md:block absolute left-1/2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full transform -translate-x-3 z-20 border-4 border-[#0080a3] shadow-lg">
                  <div className="absolute inset-1 bg-[#0080a3] rounded-full"></div>
                </div>

                {/* Point de la timeline - Mobile */}
                <div className="md:hidden absolute left-8 w-6 h-6 bg-white dark:bg-gray-800 rounded-full transform -translate-x-3 z-20 border-4 border-[#0080a3] shadow-lg">
                  <div className="absolute inset-1 bg-[#0080a3] rounded-full"></div>
                </div>

                {/* Contenu de la carte */}
                <div className={`ml-16 md:ml-0 w-full md:w-5/12 ${
                  index % 2 === 0 
                    ? 'md:pr-12' 
                    : 'md:pl-12'
                }`}>
                  <div className={`group relative ${
                    index % 2 === 0 
                      ? 'md:text-right' 
                      : 'md:text-left'
                  }`}>
                    {/* Flèche pointant vers la timeline - Desktop uniquement */}
                    <div className={`hidden md:block absolute top-8 w-0 h-0 ${
                      index % 2 === 0 
                        ? 'right-0 border-l-[20px] border-l-white dark:border-l-gray-800 border-y-[15px] border-y-transparent translate-x-full' 
                        : 'left-0 border-r-[20px] border-r-white dark:border-r-gray-800 border-y-[15px] border-y-transparent -translate-x-full'
                    }`}></div>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 group-hover:scale-105 border border-gray-100 dark:border-gray-700">
                      {/* Badge de date */}
                      <time className="inline-flex items-center bg-[#0080a3] text-white text-sm font-bold px-4 py-2 rounded-full mb-6 shadow-lg">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {event.date}
                      </time>
                      
                      {/* Titre de l'événement */}
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                        {event.title}
                      </h2>
                      
                      {/* Description */}
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section de conclusion */}
        <section className="mt-24 text-center">
          <div className="bg-[#0080a3]/5 dark:bg-[#0080a3]/10 rounded-3xl p-12 border border-[#0080a3]/20 dark:border-[#0080a3]/30">
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-center mb-6">
                <Image 
                  src="/icons/space-rocket-launch.png" 
                  alt="Space Rocket Launch" 
                  width={64} 
                  height={64} 
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Prêt pour l'AI Act ?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Ne laissez pas ces échéances vous surprendre. L'AI Act approche à grands pas et la conformité n'est plus une option. Anticipez dès maintenant avec MaydAI et transformez cette contrainte en avantage concurrentiel.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="/contact" 
                  className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commencer mon audit
                </a>
                <a 
                  href="/ia-act-ue" 
                  className="inline-flex items-center justify-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold px-8 py-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-2xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  En savoir plus sur l'AI Act
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section statistiques */}
        <section className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="text-4xl font-bold text-[#0080a3] mb-2">6</div>
              <div className="text-gray-600 dark:text-gray-300 font-medium mb-3">Échéances clés</div>
              <div className="flex justify-center">
                <Image 
                  src="/icons/level-up.png" 
                  alt="Level Up" 
                  width={32} 
                  height={32} 
                />
              </div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="text-4xl font-bold text-[#0080a3] mb-2">6</div>
              <div className="text-gray-600 dark:text-gray-300 font-medium mb-3">Années de transition</div>
              <div className="flex justify-center">
                <Image 
                  src="/icons/calendar.png" 
                  alt="Calendar" 
                  width={32} 
                  height={32} 
                />
              </div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="text-4xl font-bold text-[#0080a3] mb-2">100%</div>
              <div className="text-gray-600 dark:text-gray-300 font-medium mb-3">Conformité requise</div>
              <div className="flex justify-center">
                <Image 
                  src="/icons/speedometer.png" 
                  alt="Speedometer" 
                  width={32} 
                  height={32} 
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
    <Footer />
    </>
  );
} 