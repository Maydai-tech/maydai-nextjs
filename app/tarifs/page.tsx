import type { NextPage } from 'next';
import Image from 'next/image';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';
import FaqSection from '@/components/site-vitrine/FaqSection';
import FaqStructuredData from '@/components/site-vitrine/FaqStructuredData';

// Icône "Check" pour les listes de fonctionnalités
const CheckIcon = () => (
  <svg className="w-6 h-6 text-[#0080a3] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
  </svg>
);

const TarifsPage: NextPage = () => {
  return (
    <>
      {/* Données structurées JSON-LD pour le SEO */}
      <FaqStructuredData />
      
      <div className="bg-white text-gray-800">
        <Header />
        <main>
          {/* Section principale avec le titre */}
          <section className="py-20 px-4 text-center">
            <div className="container mx-auto">
              <div className="flex flex-col items-center mb-6">
                <Image src="/icons/tag.png" alt="Étiquette de prix" width={64} height={64} className="w-16 h-16 mb-4" />
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: '#0080a3' }}>
                  Des plans adaptés à chaque étape de votre conformité AI Act
                </h1>
              </div>
              <h2 className="mt-4 text-xl md:text-2xl font-semibold text-gray-700 max-w-3xl mx-auto">
                Commencez gratuitement ou choisissez l&apos;offre pensée pour la croissance et la scalabilité de vos projets IA.
              </h2>
            </div>
          </section>

          {/* Section des cartes de prix */}
          <section className="pb-20 px-4">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                
                {/* Carte 1: Freemium */}
                <div className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                  <div className="flex flex-col items-center mb-2">
                    <Image src="/icons/level-up.png" alt="Level Up" width={48} height={48} className="w-12 h-12 mb-3" />
                    <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Freemium</h2>
                  </div>
                  <div className="mb-4 text-center">
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>0€</span>
                    <span className="text-gray-500"> (Gratuit)</span>
                  </div>
                  <p className="text-gray-600 mb-6 h-20">Idéal pour découvrir la plateforme et initier votre démarche de conformité sur un projet test.</p>
                  <a href="/contact" className="w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    Commencer
                  </a>
                  <hr className="my-6" />
                  <ul className="space-y-4 flex-grow">
                    <li className="flex items-start"><CheckIcon /> 1 Registre IA Act</li>
                    <li className="flex items-start"><CheckIcon /> Jusqu&apos;à 2 collaborateurs</li>
                    <li className="flex items-start"><CheckIcon /> 2 cas d&apos;usage par registre</li>
                    <li className="flex items-start"><CheckIcon /> 250 Mo de stockage</li>
                  </ul>
                </div>

                {/* Carte 2: Starter */}
                <div className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                  <div className="flex flex-col items-center mb-2">
                    <Image src="/icons/speedometer.png" alt="Speedometer" width={48} height={48} className="w-12 h-12 mb-3" />
                    <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Starter</h2>
                  </div>
                  <div className="mb-4 text-center">
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>9€</span>
                    <span className="text-gray-500"> HT / mois</span>
                  </div>
                  <p className="text-gray-600 mb-6 h-20">Parfait pour les petites équipes et les startups qui structurent leur IA responsable.</p>
                  <a href="/contact" className="w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    Commencer
                  </a>
                  <hr className="my-6" />
                  <ul className="space-y-4 flex-grow">
                      <li className="flex items-start"><CheckIcon /> 2 Registres IA Act</li>
                      <li className="flex items-start"><CheckIcon /> Jusqu&apos;à 5 collaborateurs</li>
                      <li className="flex items-start"><CheckIcon /> 5 cas d&apos;usage par registre</li>
                      <li className="flex items-start"><CheckIcon /> 1 Go de stockage</li>
                  </ul>
                </div>

                {/* Carte 3: Pro (mise en avant) */}
                <div className="border-2 border-[#0080a3] rounded-2xl p-8 flex flex-col shadow-2xl relative">
                  <span className="absolute top-0 -translate-y-1/2 bg-[#0080a3] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Recommandé</span>
                  <div className="flex flex-col items-center mb-2">
                    <Image src="/icons/business-and-trade.png" alt="Business and Trade" width={48} height={48} className="w-12 h-12 mb-3" />
                    <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Pro</h2>
                  </div>
                  <div className="mb-4 text-center">
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>49€</span>
                    <span className="text-gray-500"> HT / mois</span>
                  </div>
                  <p className="text-gray-600 mb-6 h-20">Pour les équipes en croissance qui pilotent activement leur conformité IA.</p>
                  <a href="/contact" className="w-full text-center bg-[#0080a3] text-white hover:bg-[#006d8a] font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    C&apos;est parti !
                  </a>
                  <hr className="my-6" />
                  <ul className="space-y-4 flex-grow">
                      <li className="flex items-start"><CheckIcon /> 6 Registres IA Act</li>
                      <li className="flex items-start"><CheckIcon /> Jusqu&apos;à 10 collaborateurs</li>
                      <li className="flex items-start"><CheckIcon /> 10 cas d&apos;usage par registre</li>
                      <li className="flex items-start"><CheckIcon /> 5 Go de stockage</li>
                  </ul>
                </div>

                {/* Carte 4: Enterprise */}
                <div className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:shadow-xl transition-shadow duration-300">
                  <div className="flex flex-col items-center mb-2">
                    <Image src="/icons/corporation.png" alt="Corporation" width={48} height={48} className="w-12 h-12 mb-3" />
                    <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>Enterprise</h2>
                  </div>
                  <div className="mb-4 text-center">
                    <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>199€</span>
                    <span className="text-gray-500"> HT / mois</span>
                  </div>
                  <p className="text-gray-600 mb-6 h-20">Conçu pour les grandes organisations qui déploient et auditent l&apos;IA à grande échelle.</p>
                   <a href="/contact" className="w-full text-center bg-white text-[#0080a3] border border-[#0080a3] hover:bg-[#0080a3] hover:bg-opacity-10 font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                    Commencer
                  </a>
                  <hr className="my-6" />
                  <ul className="space-y-4 flex-grow">
                      <li className="flex items-start"><CheckIcon /> 25 Registres IA Act</li>
                      <li className="flex items-start"><CheckIcon /> Jusqu&apos;à 50 collaborateurs</li>
                      <li className="flex items-start"><CheckIcon /> 20 cas d&apos;usage par registre</li>
                      <li className="flex items-start"><CheckIcon /> 50 Go de stockage</li>
                  </ul>
                </div>
              </div>
               {/* Notes additionnelles sous les cartes */}
              <div className="text-center mt-12 text-gray-500 text-sm max-w-2xl mx-auto">
                  <p>Tout abonnement peut être arrêté à tout moment.</p>
                  <p>Les audits IA Act gratuits sont protégés et ne sont pas utilisés à des fins d&apos;entraînement.</p>
              </div>
            </div>
          </section>

          {/* Section FAQ */}
          <FaqSection />

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
    </>
  );
};

export default TarifsPage;
