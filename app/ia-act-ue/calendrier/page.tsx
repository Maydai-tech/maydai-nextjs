import { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';

export const metadata: Metadata = {
  title: "Agenda IA Act : Le Calendrier Complet des Échéances 2025-2030 | MaydAI",
  description: "Calendrier complet de l'AI Act européen : dates clés, échéances réglementaires 2025-2030, conformité IA, obligations entreprises. Guide expert pour naviguer dans la réglementation européenne de l'intelligence artificielle.",
  keywords: "AI Act, calendrier, échéances, conformité IA, réglementation européenne, intelligence artificielle, 2025, 2026, 2030, obligations, entreprise, GPAI, systèmes à haut risque",
  openGraph: {
    title: "Agenda IA Act : Le Calendrier Complet des Échéances 2025-2030",
    description: "Découvrez toutes les dates clés de l'AI Act européen et préparez votre entreprise à la conformité réglementaire.",
    type: "website"
  }
};

export default function IaActAgendaPage() {
  const timelineData = [
    {
      date: "1er août 2024",
      title: "Acte I, Scène 1 : Le Lever de Rideau",
      description: "Ce jour-là, le rideau s'est levé sur une pièce un peu folle : l'AI Act. L'Europe, en bonne mère de famille soucieuse, a officiellement donné le coup d'envoi à son épopée administrative. C'est ici que le calendrier de la mise au pas de nos créatures de silicium a été figé, que la promesse de leur apprendre les bonnes manières a été gravée dans le marbre du Journal Officiel.",
      details: "Publication officielle au Journal Officiel de l'Union Européenne. Entrée en vigueur du règlement (UE) 2024/1689. Début de la période de transition de 24 mois pour les entreprises. Première étape vers l'harmonisation réglementaire de l'IA en Europe.",
      impact: "Les entreprises ont désormais un cadre légal clair pour développer leurs stratégies de conformité. Les investissements en R&D IA doivent intégrer les exigences réglementaires dès la conception."
    },
    {
      date: "2 février 2025",
      title: "Fin des usages inacceptables",
      description: "L'Europe siffle la fin de la partie pour les manipulations subliminales, l'exploitation des faibles et la notation sociale par les États. Un grand ménage de printemps réglementaire.",
      details: "Interdiction définitive des systèmes d'IA considérés comme inacceptables : manipulation subliminale, exploitation des vulnérabilités, notation sociale par les États, reconnaissance biométrique en temps réel dans l'espace public (sauf exceptions strictes).",
      impact: "Les entreprises doivent immédiatement cesser tout usage de ces systèmes. Sanctions pouvant aller jusqu'à 35 millions d'euros ou 7% du chiffre d'affaires annuel mondial."
    },
    {
      date: "10 juillet 2025",
      title: "Arrivée des codes de bonne pratique",
      description: "Les fameux « codes de bonne pratique » arrivent, agissant comme un guide de savoir-vivre pour les cerveaux numériques les plus puissants, afin d'encadrer leur développement.",
      details: "Publication des codes de conduite volontaires pour les modèles d'IA générative (GPAI). Guidelines pour la transparence, la sécurité et l'éthique. Collaboration entre la Commission européenne et les acteurs de l'industrie.",
      impact: "Les développeurs de GPAI peuvent s'appuyer sur ces codes pour anticiper les exigences réglementaires. Meilleure préparation à la conformité obligatoire d'août 2025."
    },
    {
      date: "2 août 2025",
      title: "Le Grand Rendez-vous : Gouvernance et Transparence",
      description: "Les États membres doivent mettre en place leurs autorités de surveillance. Les fournisseurs de modèles d'IA à usage général (GPAI) doivent fournir une documentation technique, respecter les droits d'auteur et publier un résumé de leurs données d'entraînement.",
      details: "Mise en place des autorités nationales de surveillance dans chaque État membre. Obligations de transparence pour les GPAI : documentation technique, résumé des données d'entraînement, respect des droits d'auteur, évaluation des risques systémiques.",
      impact: "Les entreprises utilisant des GPAI doivent s'assurer que leurs fournisseurs respectent ces obligations. Nouveaux processus de due diligence à mettre en place."
    },
    {
      date: "2 août 2026",
      title: "Le Grand Jour de la Responsabilité",
      description: "La majorité des dispositions de l'AI Act deviennent la norme. Les systèmes d'IA « à haut risque » doivent se conformer à des exigences strictes et les « bacs à sable réglementaires » doivent être opérationnels.",
      details: "Application pleine et entière de l'AI Act. Conformité obligatoire pour tous les systèmes à haut risque : évaluation de conformité, gestion des risques, traçabilité, transparence, surveillance humaine. Mise en place des bacs à sable réglementaires pour tester l'IA dans un environnement contrôlé.",
      impact: "Toutes les entreprises développant ou utilisant des systèmes d'IA à haut risque doivent être conformes. Processus d'audit et de certification obligatoires. Nouveaux coûts de conformité à intégrer."
    },
    {
      date: "2027 & 2030",
      title: "Le Temps des Règlements de Comptes",
      description: "Dernières échéances pour le grand rattrapage. Les systèmes à haut risque déjà sur le marché et les grands systèmes informatiques publics devront, eux aussi, se plier à la règle commune.",
      details: "2027 : Conformité obligatoire pour les systèmes à haut risque déjà commercialisés avant août 2026. 2030 : Conformité pour les grands systèmes informatiques publics (systèmes de gestion des dossiers, systèmes de gestion des ressources humaines, systèmes de gestion des finances publiques).",
      impact: "Les systèmes legacy doivent être mis à niveau ou remplacés. Investissements importants en modernisation des infrastructures publiques et privées. Dernière chance pour les entreprises de se conformer sans sanctions."
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
          <div className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8 space-y-4">
            <p>
              L'AI Act européen représente la première réglementation mondiale complète de l'intelligence artificielle. Adopté le 13 mars 2024 et entré en vigueur le 1er août 2024, ce texte historique transforme radicalement le paysage de l'IA en Europe et au-delà.
            </p>
            <p>
              <strong>Pourquoi ce calendrier est-il crucial ?</strong> L'AI Act introduit un système de classification des risques unique au monde, avec des obligations proportionnelles au niveau de dangerosité des systèmes d'IA. Les entreprises qui négligent ces échéances s'exposent à des sanctions pouvant atteindre 7% de leur chiffre d'affaires mondial.
            </p>
            <p>
              Découvrez dans ce guide complet toutes les dates clés, les obligations spécifiques et les impacts concrets pour votre entreprise. Une roadmap indispensable pour naviguer dans cette nouvelle ère réglementaire.
            </p>
          </div>
          
          {/* Image ai-act-calendar centrée */}
          <div className="mt-10 mb-8 flex justify-center">
            <Image 
              src="/illustration/ai-act-calendar.webp" 
              alt="Calendrier et agenda complet de l'AI Act avec les dates clés et échéances"
              width={500}
              height={350}
              className="rounded-xl shadow-lg max-w-full h-auto"
            />
          </div>
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
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg mb-4">
                        {event.description}
                      </p>
                      
                      {/* Détails supplémentaires */}
                      {event.details && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📋 Détails techniques :</h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{event.details}</p>
                        </div>
                      )}
                      
                      {/* Impact sur les entreprises */}
                      {event.impact && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">⚡ Impact entreprise :</h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{event.impact}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section : Pourquoi ce calendrier est-il important pour votre entreprise ? */}
        <section className="mt-24">
          <div className="bg-gradient-to-r from-[#0080a3]/10 to-blue-50 dark:from-[#0080a3]/20 dark:to-blue-900/20 rounded-3xl p-12 border border-[#0080a3]/20 dark:border-[#0080a3]/30">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Pourquoi ce calendrier est-il crucial pour votre entreprise ?
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sanctions financières majeures</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Non-conformité = jusqu'à 35M€ ou 7% du CA mondial. Les PME ne sont pas épargnées avec des sanctions pouvant atteindre 7,5M€ ou 1,5% du CA.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Délais courts et complexes</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Seulement 24 mois de transition. Les processus de conformité peuvent prendre 6-12 mois selon la complexité de vos systèmes d'IA.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Avantage concurrentiel</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    La conformité précoce devient un facteur de différenciation. Vos clients et partenaires vous feront davantage confiance.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Innovation responsable</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    L'AI Act encourage l'innovation éthique. Vos produits IA seront plus sûrs, transparents et acceptés par le marché.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-24">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">
              Questions fréquentes sur le calendrier AI Act
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🤔 Mon entreprise utilise ChatGPT et autres IA génératives. Quelles sont mes obligations ?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <strong>Dès août 2025 :</strong> Vérifiez que vos fournisseurs (OpenAI, Google, etc.) respectent les obligations de transparence (documentation technique, résumé des données d'entraînement). <strong>Dès août 2026 :</strong> Si vous utilisez ces IA pour des décisions automatisées affectant les personnes, vous devez vous conformer aux exigences des systèmes à haut risque. Cela inclut la traçabilité, la surveillance humaine et l'évaluation des risques.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ⏰ J'ai raté l'échéance du 2 février 2025. Que faire ?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <strong>Action immédiate requise :</strong> Cessez immédiatement tout usage de systèmes d'IA inacceptables (manipulation subliminale, notation sociale, etc.). Contactez un expert en conformité AI Act pour un audit d'urgence. Les sanctions peuvent être appliquées dès le 2 février 2025. Plus vous agissez rapidement, plus vous réduisez les risques de sanctions et les coûts de mise en conformité.
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  💰 Combien coûte la conformité à l'AI Act pour une PME ?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  <strong>Coûts variables selon la complexité :</strong> Pour une PME utilisant des IA standard (ChatGPT, outils de recrutement), comptez 15 000 à 50 000€ pour l'audit et la mise en conformité. Pour des systèmes d'IA développés en interne, les coûts peuvent atteindre 100 000 à 500 000€. <strong>ROI positif :</strong> La conformité précoce évite les sanctions (jusqu'à 7,5M€) et améliore la confiance clients. MaydAI propose des solutions automatisées réduisant ces coûts de 60-70%.
                </p>
              </div>
            </div>
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