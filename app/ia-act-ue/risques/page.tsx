import { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';

export const metadata: Metadata = {
  title: "Risques IA Act : La Pyramide de Classification des IA",
  description: "Découvrez la classification des risques de l'IA Act à travers sa pyramide. De 'inacceptable' à 'minimal', comprenez chaque niveau de risque et préparez-vous aux obligations.",
};

export default function RisquesIaActPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        {/* Section 1: Introduction */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold text-[#0080a3] mb-8 leading-tight">
                Les Risques de l'IA Act : Une Approche Graduée par la Classification
              </h1>
              
              <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  Pour mettre un peu d'ordre dans le formidable tumulte de l'intelligence artificielle, l'Europe a eu cette idée assez géniale : classer les systèmes d'IA selon leur niveau de risque. Comme un bibliothécaire méticuleux qui range ses ouvrages par ordre de dangerosité potentielle, l'AI Act a établi une pyramide de classification qui va du "totalement prohibé" au "faites-vous plaisir, mais restez polis".
                </p>
                
                <div className="flex justify-center my-6">
                  <Image 
                    src="/icons/manner.png" 
                    alt="Manières et politesse" 
                    width={56} 
                    height={56} 
                    className="opacity-80"
                  />
                </div>
                
                <p>
                  Il est donc devenu urgent, pour toute organisation qui se respecte, de comprendre où se situe son système d'IA dans cette hiérarchie. Car selon l'étage où vous vous trouvez, les obligations ne sont pas les mêmes. En haut, c'est l'interdiction pure et simple. En bas, c'est la liberté presque totale. Entre les deux, c'est tout un dégradé de contraintes, de surveillances et de paperasseries à respecter.
                </p>
                
                <div className="flex justify-center my-6">
                  <Image 
                    src="/icons/app.png" 
                    alt="Paperasseries et obligations" 
                    width={56} 
                    height={56} 
                    className="opacity-80"
                  />
                </div>
                
                <p>
                  Cette pyramide, que vous voyez là, n'est pas qu'un schéma théorique. C'est votre boussole pour naviguer dans les méandres de la conformité européenne. Elle vous dit où vous en êtes, ce qu'on attend de vous, et surtout, ce que vous risquez si vous faites la sourde oreille.
                </p>
                
                <div className="flex justify-center my-6">
                  <Image 
                    src="/icons/compass-icon.png" 
                    alt="Boussole de conformité" 
                    width={56} 
                    height={56} 
                    className="opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: The Risk Pyramid */}
        <section className="py-4 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-center text-[#0080a3] mb-4">
              La Pyramide des Risques :<br />
              Quatre Niveaux pour Classer les IA
            </h2>
            
            <div className="flex justify-center">
              <div className="relative w-full max-w-7xl">
                {/* Pyramide 2D SVG - Vraie pyramide bien proportionnée */}
                <svg width="100%" height="500" viewBox="0 0 1400 500" className="mx-auto">
                  <defs>
                    {/* Gradients pour effet visuel */}
                    <linearGradient id="gradientInacceptable" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ff5252" />
                      <stop offset="100%" stopColor="#d32f2f" />
                    </linearGradient>
                    <linearGradient id="gradientEleve" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ffa726" />
                      <stop offset="100%" stopColor="#f57c00" />
                    </linearGradient>
                    <linearGradient id="gradientLimite" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#42a5f5" />
                      <stop offset="100%" stopColor="#1976d2" />
                    </linearGradient>
                    <linearGradient id="gradientMinimal" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#66bb6a" />
                      <stop offset="100%" stopColor="#388e3c" />
                    </linearGradient>
                  </defs>
                  
                  {/* Niveau 4 - Base (Risque Minimal) - Vraie pyramide */}
                  <polygon 
                    points="450,450 950,450 850,350 550,350" 
                    fill="url(#gradientMinimal)" 
                    stroke="#ffffff" 
                    strokeWidth="4"
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                  
                  {/* Niveau 3 (Risque Limité) */}
                  <polygon 
                    points="550,350 850,350 775,250 625,250" 
                    fill="url(#gradientLimite)" 
                    stroke="#ffffff" 
                    strokeWidth="4"
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                  
                  {/* Niveau 2 (Risque Élevé) */}
                  <polygon 
                    points="625,250 775,250 725,150 675,150" 
                    fill="url(#gradientEleve)" 
                    stroke="#ffffff" 
                    strokeWidth="4"
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                  
                  {/* Niveau 1 - Sommet (Risque Inacceptable) */}
                  <polygon 
                    points="675,150 725,150 700,50" 
                    fill="url(#gradientInacceptable)" 
                    stroke="#ffffff" 
                    strokeWidth="4"
                    className="hover:brightness-110 transition-all duration-300 cursor-pointer"
                  />
                  
                  {/* Numérotation des niveaux */}
                  <circle cx="700" cy="100" r="22" fill="#ffffff" stroke="#d32f2f" strokeWidth="3"/>
                  <text x="700" y="108" textAnchor="middle" fill="#d32f2f" fontSize="16" fontWeight="bold">1</text>
                  
                  <circle cx="700" cy="200" r="22" fill="#ffffff" stroke="#f57c00" strokeWidth="3"/>
                  <text x="700" y="208" textAnchor="middle" fill="#f57c00" fontSize="16" fontWeight="bold">2</text>
                  
                  <circle cx="700" cy="300" r="22" fill="#ffffff" stroke="#1976d2" strokeWidth="3"/>
                  <text x="700" y="308" textAnchor="middle" fill="#1976d2" fontSize="16" fontWeight="bold">3</text>
                  
                  <circle cx="700" cy="400" r="22" fill="#ffffff" stroke="#388e3c" strokeWidth="3"/>
                  <text x="700" y="408" textAnchor="middle" fill="#388e3c" fontSize="16" fontWeight="bold">4</text>
                  
                  {/* Textes explicatifs - Taille augmentée x1,5 */}
                  
                  {/* Niveau 1 - À gauche */}
                  <line x1="678" y1="100" x2="350" y2="100" stroke="#d32f2f" strokeWidth="2" strokeDasharray="6,3" />
                  <circle cx="350" cy="100" r="4" fill="#d32f2f" />
                  
                  <text x="36" y="108" fill="#d32f2f" fontSize="24" fontWeight="bold">Risque Inacceptable</text>
                  <text x="36" y="130" fill="#666" fontSize="20">Systèmes d&apos;IA interdits en Europe</text>
                  <text x="36" y="150" fill="#666" fontSize="17">• Manipulation subliminale</text>
                  <text x="36" y="168" fill="#666" fontSize="17">• Notation sociale générale</text>
                  <text x="36" y="186" fill="#666" fontSize="17">• Exploitation des vulnérabilités</text>
                  
                  {/* Niveau 2 - À droite */}
                  <line x1="722" y1="200" x2="1000" y2="200" stroke="#f57c00" strokeWidth="2" strokeDasharray="6,3" />
                  <circle cx="1000" cy="200" r="4" fill="#f57c00" />
                  
                  <text x="1010" y="208" fill="#f57c00" fontSize="24" fontWeight="bold">Risque Élevé</text>
                  <text x="1010" y="230" fill="#666" fontSize="20">IA à fort impact, strictement réglementée</text>
                  <text x="1010" y="250" fill="#666" fontSize="17">• Recrutement et RH</text>
                  <text x="1010" y="268" fill="#666" fontSize="17">• Forces de l&apos;ordre</text>
                  <text x="1010" y="286" fill="#666" fontSize="17">• Systèmes critiques</text>
                  
                  {/* Niveau 3 - À gauche */}
                  <line x1="678" y1="300" x2="350" y2="300" stroke="#1976d2" strokeWidth="2" strokeDasharray="6,3" />
                  <circle cx="350" cy="300" r="4" fill="#1976d2" />
                  
                  <text x="36" y="308" fill="#1976d2" fontSize="24" fontWeight="bold">Risque Limité</text>
                  <text x="36" y="330" fill="#666" fontSize="20">Obligation de transparence</text>
                  <text x="36" y="350" fill="#666" fontSize="17">• Chatbots et assistants</text>
                  <text x="36" y="368" fill="#666" fontSize="17">• Reconnaissance d&apos;émotions</text>
                  <text x="36" y="386" fill="#666" fontSize="17">• Détection de deepfakes</text>
                  
                  {/* Niveau 4 - À droite */}
                  <line x1="722" y1="400" x2="1000" y2="400" stroke="#388e3c" strokeWidth="2" strokeDasharray="6,3" />
                  <circle cx="1000" cy="400" r="4" fill="#388e3c" />
                  
                  <text x="1010" y="408" fill="#388e3c" fontSize="24" fontWeight="bold">Risque Minimal</text>
                  <text x="1010" y="430" fill="#666" fontSize="20">Libre utilisation, peu de contraintes</text>
                  <text x="1010" y="450" fill="#666" fontSize="17">• Filtres anti-spam</text>
                  <text x="1010" y="468" fill="#666" fontSize="17">• Recommandations de contenu</text>
                  <text x="1010" y="486" fill="#666" fontSize="17">• Outils d&apos;optimisation</text>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Detailed Risk Levels */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Niveau 1 - Risque Inacceptable */}
              <article className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-[#d32f2f] hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 bg-[#d32f2f] rounded-full mr-3"></div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Niveau 1 - Le Risque Inacceptable : Les Parjures Numériques
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Au sommet de notre pyramide, dans la zone rouge sang, trônent les systèmes d'IA que l'Europe considère comme des parjures numériques. Ce sont les manipulateurs, les exploiteurs, les systèmes qui s'attaquent aux plus vulnérables d'entre nous. Ici, pas de demi-mesure : c'est l'interdiction pure et simple. Utiliser de tels systèmes, c'est s'exposer aux sanctions les plus lourdes de l'AI Act.
                </p>
              </article>

              {/* Niveau 2 - Risque Élevé */}
              <article className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-[#f57c00] hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 bg-[#f57c00] rounded-full mr-3"></div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Niveau 2 - Le Risque Élevé : Les Poids Lourds sous Haute Surveillance
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Juste en dessous, nous trouvons les systèmes d'IA à haut risque. Ce sont les poids lourds de l'intelligence artificielle, ceux qui ont le pouvoir d'affecter significativement la vie des gens. L'Europe les surveille de près et leur impose un cahier des charges strict :
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                  <li>Système de gestion de la qualité rigoureux</li>
                  <li>Documentation technique exhaustive</li>
                  <li>Enregistrement automatique des activités</li>
                  <li>Transparence et information des utilisateurs</li>
                  <li>Surveillance humaine continue</li>
                  <li>Robustesse, précision et cybersécurité</li>
                </ul>
              </article>

              {/* Niveau 3 - Risque Limité */}
              <article className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-[#1976d2] hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 bg-[#1976d2] rounded-full mr-3"></div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Niveau 3 - Le Risque Limité : Les Illusionnistes et le Devoir de Politesse
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Au troisième niveau, nous rencontrons les systèmes d'IA à risque limité. Ce sont les illusionnistes du monde numérique : chatbots, systèmes de reconnaissance d'émotions, ou générateurs de contenu. Leur obligation ? La politesse. Ils doivent prévenir l'utilisateur qu'il interagit avec une IA. Pas de tromperie, pas de manipulation silencieuse. Juste une information claire et honnête.
                </p>
              </article>

              {/* Niveau 4 - Risque Minimal */}
              <article className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-[#388e3c] hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  <div className="w-4 h-4 bg-[#388e3c] rounded-full mr-3"></div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Niveau 4 - Le Risque Minimal : Le Champ Libre
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  En bas de la pyramide, dans la verte prairie de la liberté, nous trouvons les systèmes d'IA à risque minimal. Filtres anti-spam, systèmes de recommandation de films, outils d'optimisation énergétique : autant de technologies qui peuvent s'épanouir sans contraintes particulières. Ici, l'Europe fait confiance et laisse l'innovation suivre son cours naturel.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Section 4: Sanctions and Deadlines */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0080a3] mb-8">
              L'Heure des Comptes : Le Tic-tac de l'Horloge et le Poids du Portefeuille
            </h2>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                Ne nous y trompons pas : cette pyramide n'est pas qu'un joli schéma théorique. Elle s'accompagne d'un calendrier précis et d'amendes qui peuvent faire très mal au portefeuille. L'Europe ne plaisante pas avec la conformité, et les sanctions peuvent aller jusqu'à des montants astronomiques.
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg mb-8">
                <h3 className="text-xl font-bold text-red-800 mb-4">Sanctions Financières :</h3>
                <ul className="space-y-3 text-red-700">
                  <li className="flex items-start">
                    <Image 
                      src="/icons/withdraw.png" 
                      alt="Sanctions financières" 
                      width={24} 
                      height={24} 
                      className="mr-3 mt-1"
                    />
                    <span><strong>Jusqu&apos;à 35 millions d&apos;euros</strong> ou 7% du chiffre d'affaires annuel mondial pour les infractions aux systèmes d&apos;IA interdits</span>
                  </li>
                  <li className="flex items-start">
                    <Image 
                      src="/icons/auction.png" 
                      alt="Sanctions pour non-conformité" 
                      width={24} 
                      height={24} 
                      className="mr-3 mt-1"
                    />
                    <span><strong>Jusqu&apos;à 15 millions d&apos;euros</strong> ou 3% du chiffre d&apos;affaires annuel mondial pour non-conformité aux exigences de l&apos;AI Act</span>
                  </li>
                  <li className="flex items-start">
                    <Image 
                      src="/icons/lawyer.png" 
                      alt="Sanctions pour informations incorrectes" 
                      width={24} 
                      height={24} 
                      className="mr-3 mt-1"
                    />
                    <span><strong>Jusqu&apos;à 7,5 millions d&apos;euros</strong> ou 1,5% du chiffre d'affaires annuel mondial pour fourniture d&apos;informations incorrectes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Call-to-Action for MaydAI */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#0080a3] to-[#7bcbe0]">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
              Et nous, dans tout ça ? Naviguer dans la Pénombre
            </h2>
            
            <p className="text-xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed">
              Face à ce labyrinthe de devoirs et d'obligations, il est facile de se sentir perdu. C'est là que MaydAI entre en scène, avec deux solutions pensées pour vous accompagner dans cette transition vers la conformité.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Identifier pour ne pas subir</h3>
                <p className="leading-relaxed">
                  Notre première mission : vous aider à identifier précisément où se situent vos systèmes d'IA dans cette pyramide des risques. Parce qu'on ne peut pas se conformer à quelque chose qu'on ne comprend pas.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Analyser pour comprendre</h3>
                <p className="leading-relaxed">
                  Notre seconde mission : analyser vos pratiques actuelles et vous proposer un plan d'action concret pour atteindre la conformité, sans vous noyer dans la complexité réglementaire.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <a 
                href="/contact"
                className="inline-flex items-center bg-white text-[#0080a3] hover:bg-gray-50 font-bold px-12 py-4 rounded-2xl text-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Évaluez votre risque dès maintenant
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
} 