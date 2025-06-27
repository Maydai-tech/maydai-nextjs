import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Agenda IA Act : Le Calendrier Complet des Échéances 2025-2030",
  description: "Découvrez le calendrier détaillé et l'agenda complet de l'AI Act. Suivez les dates clés et les obligations pour les entreprises et les modèles d'IA."
};

export default function IaActAgendaPage() {
  const timelineData = [
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
    <main className="min-h-screen bg-white dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête de la page */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            L'Agenda de l'AI Act : Calendrier et Échéances Clés
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Ah, nous y sommes. À la veille du grand rendez-vous. Voilà un an que le grand ballet de l'AI Act a commencé...
          </p>
        </section>

        {/* Timeline */}
        <section className="relative">
          {/* Ligne verticale de la timeline */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-teal-500 transform md:-translate-x-px"></div>

          {/* Éléments de la timeline */}
          <div className="space-y-12">
            {timelineData.map((event, index) => (
              <article 
                key={index}
                className={`relative flex items-center ${
                  index % 2 === 0 
                    ? 'md:justify-start' 
                    : 'md:justify-end'
                }`}
              >
                {/* Point sur la timeline */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-teal-500 rounded-full transform -translate-x-2 md:-translate-x-2 z-10 border-4 border-white dark:border-gray-900"></div>

                {/* Contenu de la carte */}
                <div className={`ml-16 md:ml-0 w-full md:w-5/12 ${
                  index % 2 === 0 
                    ? 'md:pr-8 md:text-right' 
                    : 'md:pl-8 md:text-left'
                }`}>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
                    {/* Badge de date */}
                    <time className="inline-block bg-teal-500 text-white text-sm font-semibold px-3 py-1 rounded-full mb-4">
                      {event.date}
                    </time>
                    
                    {/* Titre de l'événement */}
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                      {event.title}
                    </h2>
                    
                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section de conclusion */}
        <section className="mt-16 text-center">
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Prêt pour l'AI Act ?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Ne laissez pas ces échéances vous surprendre. Anticipez dès maintenant votre conformité avec MaydAI.
            </p>
            <a 
              href="/contact" 
              className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-300"
            >
              Commencer mon audit
            </a>
          </div>
        </section>
      </div>
    </main>
  );
} 