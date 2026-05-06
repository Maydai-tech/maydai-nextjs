import type { NextPage } from 'next';
import Image from 'next/image';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';
import FaqSection from '@/components/site-vitrine/FaqSection';
import FaqStructuredData from '@/components/site-vitrine/FaqStructuredData';
import TarifsPricingClient from '@/components/site-vitrine/TarifsPricingClient'

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
              <TarifsPricingClient />
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
                    href="/signup" 
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
                  Aucun engagement • Support sur mesure • Assistance conformité
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
