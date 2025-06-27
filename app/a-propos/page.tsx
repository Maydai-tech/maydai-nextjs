import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Données des membres de l'équipe
const teamMembers = [
  {
    id: 'thomas',
    image: '/screenshots/Thomas.avif',
    alt: 'Photo de Thomas, Directeur chez MaydAI',
    role: 'DIRECTEUR',
    name: 'THOMAS',
    description: '20 ans d\'expériences Digital, Cloud & Data',
    jobTitle: 'Directeur',
    url: 'https://maydai.io/a-propos#thomas'
  },
  {
    id: 'hugues',
    image: '/screenshots/Hugues.webp',
    alt: 'Photo de Hugues, Développeur chez MaydAI',
    role: 'DÉVELOPPEUR',
    name: 'HUGUES',
    description: '10 ans d\'expériences DEV WEB & APP',
    jobTitle: 'Développeur',
    url: 'https://maydai.io/a-propos#hugues'
  },
  {
    id: 'anna',
    image: '/screenshots/Anna.webp',
    alt: 'Photo de Anna, Creative chez MaydAI',
    role: 'CREATIVE',
    name: 'ANNA',
    description: '15 ans d\'expérience création de contenus',
    jobTitle: 'Creative',
    url: 'https://maydai.io/a-propos#anna'
  },
  {
    id: 'maxime',
    image: '/screenshots/Maxime.webp',
    alt: 'Photo de Maxime, Consultant chez MaydAI',
    role: 'CONSULTANT',
    name: 'MAXIME',
    description: '6 ans d\'expériences gestion de projets digitaux',
    jobTitle: 'Consultant',
    url: 'https://maydai.io/a-propos#maxime'
  }
];

// Composant pour une carte de membre d'équipe
function TeamMemberCard({ member }: { member: typeof teamMembers[0] }) {
  return (
    <div id={member.id} className="text-center group">
      {/* Image du membre */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        <Image
          src={member.image}
          alt={member.alt}
          fill
          className="rounded-full object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300"
          sizes="(max-width: 768px) 160px, 160px"
        />
      </div>
      
      {/* Rôle */}
      <p className="text-[#0080a3] font-bold uppercase text-sm tracking-wide mb-2">
        {member.role}
      </p>
      
      {/* Nom */}
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        {member.name}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
        {member.description}
      </p>
    </div>
  );
}

export default function AProposPage() {
  // Génération des données structurées JSON-LD pour chaque membre
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MaydAI",
    "url": "https://maydai.io",
    "description": "Entreprise spécialisée en intelligence artificielle et conformité IA Act",
    "employee": teamMembers.map(member => ({
      "@type": "Person",
      "name": member.name,
      "jobTitle": member.jobTitle,
      "description": member.description,
      "url": member.url,
      "worksFor": {
        "@type": "Organization",
        "name": "MaydAI"
      }
    }))
  };

  return (
    <>
      {/* Données structurées JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      <Header />
      <main className="min-h-screen bg-white">
        {/* Section principale */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Bloc de titre */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Découvrez l'Équipe d'Experts{' '}
                <span className="text-[#0080a3]">MaydAI</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                Experte en droit international, IA Act, Python, Data et Machine Learning, notre équipe multidisciplinaire 
                vous accompagne dans toutes les étapes d'un projet de conformité IA Act.
              </p>
            </div>

            {/* Section Histoire de MaydAI */}
            <div className="mb-20">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 lg:p-12">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    Notre Histoire & Mission
                  </h2>
                  
                  <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                    <p className="mb-6">
                      Fort de trois années d'expérience avec l'agence <strong>Mayday Consulting</strong>, les équipes de développeurs et de consultants ont décidé de créer la plateforme <strong>MaydAI</strong> pour l'IA Act. Suite aux nombreux échanges avec nos clients pour la conception de cas d'usage IA, il nous paraissait important de démarrer chaque projet en étant <em>"IA Act compliant by design"</em> et en conseillant nos clients pour cette approche éthique de l'IA.
                    </p>
                    
                    <p className="mb-6">
                      C'est pourquoi nous avons décidé en <strong>2025</strong> de créer la plateforme <strong>MaydAI IA Act</strong> afin de fournir à toutes les entreprises désireuses de développer des cas d'usage IA, les moyens de comprendre le cadre législatif, les plans de remédiations éventuels et les informations clés leur permettant d'être réglementaires avec le cadre législatif IA Act européen.
                    </p>
                    
                    <div className="bg-[#0080a3]/5 rounded-lg p-6 mt-8">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-6 h-6 text-[#0080a3] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Notre Engagement
                      </h3>
                      <p className="text-gray-700 italic">
                        "Rendre l'intelligence artificielle accessible, éthique et conforme aux réglementations européennes pour toutes les entreprises, quelle que soit leur taille."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grille des membres de l'équipe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>

            {/* Section supplémentaire sur l'entreprise */}
            <div className="mt-20 text-center">
              <div className="bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl p-8 lg:p-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Pourquoi Choisir MaydAI ?
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                  {/* Expertise */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#0080a3] rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Expertise Technique</h3>
                    <p className="text-gray-600">Plus de 50 ans d'expérience cumulée en développement, data science et IA</p>
                  </div>

                  {/* Innovation */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#0080a3] rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Innovation Continue</h3>
                    <p className="text-gray-600">À la pointe des dernières technologies IA et des réglementations comme l'IA Act</p>
                  </div>

                  {/* Accompagnement */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#0080a3] rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Accompagnement Personnalisé</h3>
                    <p className="text-gray-600">Un suivi sur mesure pour chaque projet, de la conception à la mise en production</p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="mt-10">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Prêt à collaborer avec notre équipe ?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Contactez-nous pour discuter de votre projet IA et découvrir comment nous pouvons vous accompagner
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href="/contact" 
                      className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-8 py-3 rounded-lg transition-colors"
                    >
                      Nous contacter
                    </a>
                    <a 
                      href="/fonctionnalites" 
                      className="inline-flex items-center justify-center border border-[#0080a3] text-[#0080a3] hover:bg-[#0080a3] hover:text-white font-bold px-8 py-3 rounded-lg transition-colors"
                    >
                      Découvrir nos services
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
} 