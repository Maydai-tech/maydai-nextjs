"use client"; // Rend le composant interactif côté client pour la FAQ.

import { useState } from 'react';
import type { NextPage } from 'next';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/*
  Suggestion de métadonnées pour le SEO (à placer dans le layout.tsx parent) :

  export const metadata = {
    title: "Tarifs MaydAI | Audit IA Act Gratuit & Plans de Conformité",
    description: "Découvrez les tarifs de MaydAI. Commencez avec notre audit IA Act gratuit, choisissez un plan mensuel, ou demandez un devis sur mesure pour une conformité totale.",
    alternates: {
      canonical: '/tarifs',
    },
  };
*/

// Icône "Check" pour les listes de fonctionnalités
const CheckIcon = () => (
  <svg className="w-6 h-6 text-[#0080a3] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
  </svg>
);

const TarifsPage: NextPage = () => {
  // Gère l'état d'ouverture de chaque question dans la FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqData = [
    {
      q: "Qu'est-ce que l'AI Act de l'UE ? Est-ce une nouvelle chimère bureaucratique ou une chance pour l'humanité ?",
      a: "L'AI Act de l'UE, mes chers amis, est un cadre réglementaire proposé par cette bonne vieille Commission européenne. Son ambition ? S'assurer que les systèmes d'IA soient non seulement sûrs et transparents, mais qu'ils conservent aussi cette étincelle d'éthique qui nous distingue des machines. Imaginez un peu : un code de la route pour des intelligences qui n'ont pas encore eu leur permis de conduire la complexité du monde. Il impose des obligations aux développeurs et utilisateurs, calibrées sur le niveau de risque de leurs systèmes. Fini le Far West numérique, place à la civilisation… du moins, on l'espère !",
    },
    {
        q: "Comment la plateforme MaydAI m'aide-t-elle à ne pas me perdre dans ce labyrinthe de la conformité ?",
        a: "Ah, voilà la question qui nous réjouit ! La plateforme MaydAI, c'est votre guide de montagne personnel, équipé des meilleures cartes et d'une gourde inépuisable. Nous vous offrons des flux de travail automatisés – pour éviter de vous retrouver à jongler avec des tableurs jusqu'à l'aube – des modèles pré-construits – pour ne pas réinventer la roue à chaque fois – et des conseils d'experts, tous alignés sur l'AI Act de l'UE. En clair, nous simplifions le processus de conformité au point de réduire les efforts manuels jusqu'à 70 %. Autant dire que vous aurez le temps de flâner, d'écrire des poèmes, ou de vous consacrer à l'art ancestral de la sieste sous les oliviers.",
    },
    {
        q: "MaydAI peut-elle m'éviter le naufrage réglementaire dans des eaux internationales ?",
        a: "Absolument ! Notre plateforme MaydAI est une embarcation robuste, taillée pour les mers agitées de la réglementation mondiale. Elle supporte la conformité avec des géants comme le RGPD, le NIST AI RMF et l'ISO 42001. Grâce à notre support multi-entités et nos espaces de conformité personnalisables, vous maintiendrez le cap à travers toutes vos unités commerciales et juridictions, des steppes russes aux plages californiennes, sans jamais sentir le vent du gendarme réglementaire sur vos fesses.",
    },
    {
        q: "Combien de temps faudra-t-il pour atteindre cette terre promise de la conformité ?",
        a: "Le temps, cette denrée si précieuse ! Avec MaydAI, la plupart des organisations atteignent la conformité en moins de 6 semaines. Comparez cela aux méthodes traditionnelles qui vous feraient traîner des mois, voire des années, à travers les déserts administratifs. Nous vous offrons le raccourci, la voie rapide vers la sérénité. Plus besoin de se poser la question existentielle de savoir si l'on aura assez vécu avant que les règlements ne nous rattrapent !",
    },
    {
        q: "Est-ce que MaydAI peut transformer mon avocat en poète ?",
        a: "Nous ne pouvons garantir une métamorphose poétique complète de votre conseiller juridique. Cependant, en réduisant drastiquement le temps passé sur la paperasse fastidieuse de la conformité, MaydAI pourrait bien lui libérer l'esprit pour qu'il puisse, qui sait, esquisser quelques vers en alexandrins plutôt que des clauses en jargon. Moins de stress, plus d'inspiration !",
    },
    {
        q: "Mon IA est un peu \"sauvage\". MaydAI peut-elle l'apprivoiser ou va-t-elle me dénoncer aux autorités ?",
        a: "Ah, le tempérament sauvage de l'IA, un sujet passionnant ! Chez MaydAI, nous ne sommes pas de la police. Nous sommes là pour vous aider à comprendre les comportements de votre IA, à identifier les risques et à mettre en place les garde-fous nécessaires pour qu'elle puisse s'exprimer en toute conformité. Nous prônons la domestication élégante, non l'extinction. Après tout, même les créatures les plus indomptables peuvent trouver leur place dans un monde bien ordonné, si l'on sait y mettre la bonne pincée de sagesse et de technologie.",
    },
    {
        q: "J'ai entendu dire que l'IA peut parfois \"halluciner\". Est-ce que MaydAI dispose d'un antidote à la bêtise artificielle ?",
        a: "L'hallucination, ce doux délire numérique... Bien que MaydAI ne soit pas une pilule d'humilité à avaler chaque matin, notre plateforme est conçue pour renforcer la transparence et la traçabilité de vos systèmes d'IA. En comprenant mieux comment et pourquoi vos modèles prennent leurs décisions, vous pourrez mieux anticiper les \"fantaisies\" algorithmiques. Nous ne promettons pas de vous débarrasser de toute forme de bêtise – après tout, elle est humaine, n'est-ce pas ? – mais nous vous donnerons les outils pour mieux la circonscrire.",
    },
    {
        q: "Ma grand-mère disait que \"rien n'est jamais acquis\". Est-ce que la conformité avec MaydAI est une affaire définitive, ou un éternel recommencement ?",
        a: "Votre grand-mère avait la sagesse des anciens, et elle avait raison ! Le monde de l'IA, comme la vie elle-même, est en perpétuel mouvement. Les réglementations évoluent, les technologies aussi. C'est pourquoi MaydAI n'est pas une solution \"ponctuelle\", mais un compagnon de route. Nous vous aidons à rester agile, à vous adapter aux changements, à maintenir une veille constante. La conformité n'est pas une destination finale, mais un voyage, et nous serons à vos côtés pour chaque nouvelle étape, pour que l'aube de la conformité ne soit jamais une promesse non tenue.",
    },
    {
        q: "Est-ce que MaydAI peut me faire gagner un championnat de ping-pong ?",
        a: "Hélas, cher champion, le ping-pong relève de l'art du geste humain, de la finesse du poignet, et non de l'algorithme ! Bien que nous puissions vous libérer un temps précieux pour vous entraîner, nous ne pouvons pas encore vous garantir la victoire sur table. Mais qui sait, avec l'esprit allégé par une conformité sans accroc, votre concentration sur la petite balle blanche pourrait être décuplée. L'avenir, après tout, est plein de surprises.",
    },
  ];

  return (
    <div className="bg-white text-gray-800">
      <Header />
      <main>
        {/* Section principale avec le titre */}
        <section className="py-20 px-4 text-center">
          <div className="container mx-auto">
            <div className="flex flex-col items-center mb-6">
              <Image src="/icons/tag.png" alt="Étiquette de prix" width={64} height={64} className="w-16 h-16 mb-4" />
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: '#0080a3' }}>
                Tarifs MaydAI
              </h1>
            </div>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Trouvez le plan adapté à votre situation : audit IA gratuit pour démarrer ou tester une idée de cas d'usage IA, un abonnement mensuel pour les organisations plus complexes ou un devis sur mesure pour intégrer dès à présent l'IA Act dans votre entreprise.
            </p>
          </div>
        </section>

        {/* Section des cartes de prix */}
        <section className="pb-20 px-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              
              {/* Carte 1: Starter */}
              <div className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center mb-2">
                  <Image src="/icons/level-up.png" alt="Level Up" width={48} height={48} className="w-12 h-12 mb-3" />
                  <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>La Mise en Bouche</h2>
                </div>
                <div className="mb-4 text-center">
                  <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>0€</span>
                  <span className="text-gray-500"> (Gratuit)</span>
                </div>
                <p className="text-gray-600 mb-6 h-20">Vous souhaitez agir tout de suite, vous mettre en conformité ou tester des projets IA.</p>
                <a href="/contact" className="w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                  Commencer
                </a>
                <hr className="my-6" />
                <ul className="space-y-4 flex-grow">
                  <li className="flex items-start"><CheckIcon /> 1 registre IA Act</li>
                  <li className="flex items-start"><CheckIcon /> 1 Dashboard Entreprise</li>
                  <li className="flex items-start"><CheckIcon /> 6 cas d&apos;usage IA disponibles</li>
                  <li className="flex items-start"><CheckIcon /> 6 models de cas d&apos;usage disponibles</li>
                  <li className="flex items-start"><CheckIcon /> 3 invitations pour collaborer</li>
                  <li className="flex items-start"><CheckIcon /> Support Email</li>
                </ul>
              </div>

              {/* Carte 2: Adopter (mise en avant) */}
              <div className="border-2 border-[#0080a3] rounded-2xl p-8 flex flex-col shadow-2xl relative">
                 <span className="absolute top-0 -translate-y-1/2 bg-[#0080a3] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Recommandé</span>
                <div className="flex flex-col items-center mb-2">
                  <Image src="/icons/le-coucher-du-soleil.png" alt="Coucher du soleil" width={48} height={48} className="w-12 h-12 mb-3" />
                  <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Le Lève-tôt</h2>
                </div>
                <div className="mb-4 text-center">
                  <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>10€</span>
                  <span className="text-gray-500"> / Par mois</span>
                </div>
                <p className="text-gray-600 mb-6 h-20">Vous avez la volonté de centraliser et d'évaluer tous les cas d&apos;usages de votre entreprise et/ou de ses filiales.</p>
                <a href="/contact" className="w-full text-center bg-[#0080a3] text-white hover:bg-[#006d8a] font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                  C'est parti !
                </a>
                <hr className="my-6" />
                <ul className="space-y-4 flex-grow">
                    <li className="flex items-start"><CheckIcon /> 1 super registre IA Act</li>
                    <li className="flex items-start"><CheckIcon /> 3 registres IA Act</li>
                    <li className="flex items-start"><CheckIcon /> 4 Dashboards Entreprise</li>
                    <li className="flex items-start"><CheckIcon /> 12 cas d&apos;usage IA disponibles</li>
                    <li className="flex items-start"><CheckIcon /> 12 models de cas d&apos;usage disponibles</li>
                    <li className="flex items-start"><CheckIcon /> 6 invitations pour collaborer</li>
                    <li className="flex items-start"><CheckIcon /> Support prioritaire</li>
                </ul>
              </div>

              {/* Carte 3: Sur mesure */}
              <div className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                <div className="flex flex-col items-center mb-2">
                  <Image src="/icons/chapeau-de-pilote.png" alt="Chapeau de pilote" width={48} height={48} className="w-12 h-12 mb-3" />
                  <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Le Pilote</h2>
                </div>
                <div className="mb-4 text-center">
                  <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>1K€</span>
                  <span className="text-gray-500"> (Mission 1 mois)</span>
                </div>
                <p className="text-gray-600 mb-6 h-20">Devis entreprise: Vous avez besoin d'être accompagné en matière de formation, de création d&apos;audit IA act et de registre entreprise.</p>
                 <a href="/contact" className="w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                  Attachez vos ceintures !
                </a>
                <hr className="my-6" />
                <ul className="space-y-4 flex-grow">
                    <li className="flex items-start"><CheckIcon /> 1 formation sur site</li>
                    <li className="flex items-start"><CheckIcon /> 1 atelier audit IA act</li>
                    <li className="flex items-start"><CheckIcon /> Création du Dashboard Entreprise</li>
                    <li className="flex items-start"><CheckIcon /> Cas d&apos;usage IA illimités</li>
                    <li className="flex items-start"><CheckIcon /> Collaboration illimitée</li>
                    <li className="flex items-start"><CheckIcon /> Support juridique relecture cas d&apos;usage</li>
                    <li className="flex items-start"><CheckIcon /> Support prioritaire</li>
                </ul>
              </div>
            </div>
             {/* Notes additionnelles sous les cartes */}
            <div className="text-center mt-12 text-gray-500 text-sm max-w-2xl mx-auto">
                <p>Tout abonnement peut être arrêté à tout moment.</p>
                <p>Les audits IA Act gratuits sont protégés et ne sont pas utilisés à des fins d'entraînement (ce qui est hélas le cas aujourd&apos;hui de l&apos;IA gratuite).</p>
            </div>
          </div>
        </section>

        {/* Section FAQ */}
        <section className="py-20 px-4 bg-gray-50">
            <div className="container mx-auto max-w-4xl">
                 <div className="text-center mb-12">
                     <div className="flex flex-col items-center mb-4">
                       <Image src="/icons/chats.png" alt="Chat" width={64} height={64} className="w-16 h-16 mb-4" />
                       <h2 className="text-3xl md:text-4xl font-extrabold text-[#0080a3]">
                          FAQ MaydAI
                       </h2>
                     </div>
                     <p className="mt-3 text-lg text-gray-600">
                        La Boussole Éthique pour l'Ère Numérique
                     </p>
                 </div>
                 <div className="space-y-4">
                     {faqData.map((item, index) => (
                         <div key={index} className="border border-gray-200 rounded-lg">
                             <button
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-100"
                            >
                                <span>{item.q}</span>
                                {openFaq === index ? (
                                    <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6"></path></svg>
                                ) : (
                                    <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                )}
                            </button>
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === index ? 'max-h-screen' : 'max-h-0'}`}>
                                <div className="p-5 pt-0 text-gray-600">
                                    <p>{item.a}</p>
                                </div>
                            </div>
                         </div>
                     ))}
                 </div>
            </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
              <div className="mb-6">
                <Image 
                  src="/icons/speedometer.png" 
                  alt="Compteur de vitesse" 
                  width={64} 
                  height={64} 
                  className="mx-auto mb-4"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Prêt à accélérer votre <span className="text-[#0080a3]">conformité IA</span> ?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Choisissez votre rythme et démarrez dès aujourd'hui. Que vous souhaitiez tester gratuitement ou bénéficier d'un accompagnement complet, MaydAI s'adapte à vos besoins et à votre budget.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a 
                  href="/contact" 
                  className="bg-white text-[#0080a3] border-2 border-[#0080a3] px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#0080a3] hover:text-white transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 no-underline flex items-center gap-2"
                >
                  <Image src="/icons/space-rocket-launch.png" alt="Fusée" width={20} height={20} className="w-5 h-5" />
                  Commencer gratuitement
                </a>
                <a 
                  href="/contact" 
                  className="bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-300 shadow-md hover:shadow-lg no-underline flex items-center gap-2"
                >
                  <Image src="/icons/chats.png" alt="Chat" width={20} height={20} className="w-5 h-5" />
                  Parler à un expert
                </a>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Aucun engagement • Support inclus • Conformité garantie
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};

export default TarifsPage; 