import type { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/site-vitrine/Header';
import Footer from '@/components/site-vitrine/Footer';

export const metadata: Metadata = {
  title: "Qu'est-ce que l'IA Act UE ? Guide Complet de la Réglementation Européenne | MaydAI.io",
  description: "Découvrez l'IA Act UE, la première réglementation mondiale sur l'intelligence artificielle. Comprenez sa classification des risques, ses principes clés et son impact sur le développement de l'IA.",
  alternates: {
    canonical: 'https://www.maydai.io/ia-act-ue',
  },
  openGraph: {
    title: "Qu'est-ce que l'IA Act UE ? Guide Complet de la Réglementation Européenne | MaydAI.io",
    description: "Découvrez l'IA Act UE, la première réglementation mondiale sur l'intelligence artificielle. Comprenez sa classification des risques, ses principes clés et son impact sur le développement de l'IA.",
    url: 'https://www.maydai.io/ia-act-ue',
    images: [
      {
        url: '/eu-parlement-ai-act.jpg',
        width: 1200,
        height: 630,
        alt: "Drapeaux de l'Union Européenne devant un bâtiment institutionnel",
      },
    ],
    locale: 'fr_FR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Qu'est-ce que l'IA Act UE ? Guide Complet de la Réglementation Européenne | MaydAI.io",
    description: "Découvrez l'IA Act UE, la première réglementation mondiale sur l'intelligence artificielle. Comprenez sa classification des risques, ses principes clés et son impact sur le développement de l'IA.",
    images: ['/eu-parlement-ai-act.jpg'],
  },
};

export default function IAActUEPage() {
  return (
    <div className="bg-white">
      <Header />
      <main>
        <div className="container mx-auto px-4 py-8 sm:py-16">
          <div className="max-w-7xl mx-auto">
            {/* Layout avec sidebar */}
            <div className="flex gap-8">
              {/* Table des matières - Sidebar gauche */}
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-8">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Table des matières</h3>
                    <nav className="space-y-2">
                      <a href="#introduction" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Introduction
                      </a>
                      <a href="#coeur-reacteur" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        La Classification par Risques
                      </a>
                      <a href="#poesie-droit" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Objectifs et Principes
                      </a>
                      <a href="#applicabilite" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Applicabilité et Portée
                      </a>
                      <a href="#gpai" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Les Modèles GPAI
                      </a>
                      <a href="#gouvernance" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Gouvernance et Sanctions
                      </a>
                      <a href="#bacs-a-sable" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Bacs à Sable Réglementaires
                      </a>
                      <a href="#defis" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Défis et Impacts
                      </a>
                    </nav>
                  </div>
                </div>
              </aside>

              {/* Contenu principal */}
              <article className="flex-1 min-w-0">
                <div className="relative w-full h-64 sm:h-96 mb-8 rounded-lg overflow-hidden">
                  <Image 
                    src="/content/eu-parlement-ai-act.jpg"
                    fill
                    style={{ objectFit: 'cover' }}
                    alt="Drapeaux de l'Union Européenne devant le bâtiment de la Commission Européenne" 
                  />
                </div>
                
                {/* Contenu principal */}
                <div className="prose prose-lg max-w-none">
                  {/* En-tête */}
                  <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                      Qu&apos;est-ce que l&apos;IA Act UE ?
                    </h1>
                  </div>

                  {/* Section Introduction */}
                  <section id="introduction" className="mb-12">
                    <h2 className="text-3xl font-bold text-[#0080a3] mb-6">L&apos;AI Act : Le Gardien des principes éthiques dans le royaume débridés des IA(s)</h2>
                    <p className="text-lg leading-relaxed mb-6">
                      Ah, l&apos;Intelligence Artificielle ! Cette étrange créature, fruit de nos calculs et de nos aspirations les plus folles, qui, tel un goliath numérique, s&apos;apprête à transformer nos vies profodémment. Mais comme tout pouvoir naissant, l&apos;IA charrie avec elle son lot de mystères et de dangers. C&apos;est ici qu&apos;intervient l&apos;AI Act, ce texte singulier né du cerveau collectif européen, unique au monde en son genre, pour veiller au grain. Il n&apos;est pas question de brider l&apos;ingéniosité, mais de s&apos;assurer que notre âme, nos libertés, notre bonne vieille démocratie ne finissent pas en pâture algorithmique. C&apos;est l&apos;Europe qui, la première, ose regarder cette énigme en face, avec un mélange de sagesse et de cette pointe de mélancolie clairvoyante propre à ceux qui ont déjà vu quelques soleils se coucher.
                    </p>
                  </section>

                  {/* Section Classification par Risques */}
                  <section id="coeur-reacteur" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/risk.png" alt="Risque" width={36} height={36} className="w-9 h-9" />
                      <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">La Classification par Risques : Le Cœur du Réacteur</h2>
                    </div>
                    <p>
                      L&apos;AI Act fonctionne comme une pyramide à quatre niveaux, chacun avec ses propres règles et obligations. Cette approche basée sur les risques permet d&apos;adapter les exigences à la criticité réelle des systèmes d&apos;IA.
                    </p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                      <li><strong>Risque Inacceptable :</strong> Systèmes interdits (manipulation comportementale, exploitation des vulnérabilités)</li>
                      <li><strong>Risque Élevé :</strong> Secteurs critiques nécessitant une conformité stricte (santé, transport, justice)</li>
                      <li><strong>Risque Limité :</strong> Obligations de transparence (chatbots, deepfakes)</li>
                      <li><strong>Risque Minimal :</strong> Aucune obligation spécifique</li>
                    </ul>
                    <div className="mt-6 text-center">
                      <a 
                        href="/ia-act-ue/risques" 
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-6 py-3 rounded-lg transition-colors"
                      >
                        Pyramide Risques IA
                      </a>
                    </div>
                  </section>

                  {/* Section Objectifs et Principes */}
                  <section id="poesie-droit" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/target.png" alt="Objectif" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Objectifs et Principes : La Poésie du Droit</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-8">
                      L&apos;AI Act, ce n&apos;est pas seulement un carcan législatif ; c&apos;est une déclaration d&apos;intention, un poème juridique en six strophes, pour une IA à visage humain.
                    </p>

                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Action et Contrôle Humain : Le Serviteur, non le Maître</h3>
                        <p className="leading-relaxed text-gray-800">
                          L&apos;IA doit rester un outil, au service de l&apos;homme, respectant sa dignité et son autonomie. Pas de marionnettes numériques, s&apos;il vous plaît !
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Robustesse Technique et Sécurité : La Cybersécurité, nouveau Cheval de Bataille</h3>
                        <p className="leading-relaxed text-gray-800">
                          Les systèmes doivent être infaillibles, résilients, et se prémunir contre les mauvaises intentions. On ne veut pas d&apos;une IA qui trébuche ou qui se laisse corrompre.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Respect de la Vie Privée et Gouvernance des Données : Le Gardien du Secret</h3>
                        <p className="leading-relaxed text-gray-800">
                          Vos données sont précieuses. L&apos;IA doit les traiter avec déférence, les choyer, et n&apos;utiliser que des informations d&apos;une qualité irréprochable.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Transparence : Le Besoin de Confiance Exacerbé</h3>
                        <p className="leading-relaxed text-gray-800">
                          Que l&apos;IA nous dise ce qu&apos;elle fait, comment elle le fait. Pas de zones d&apos;ombre, pas de boîtes noires mystérieuses. On veut savoir à qui l&apos;on parle.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Diversité, Non-discrimination et Équité : Le Refus du Préjugé</h3>
                        <p className="leading-relaxed text-gray-800">
                          L&apos;IA ne doit pas reproduire nos vieilles bêtises humaines, nos discriminations, nos biais. Elle doit être le reflet de notre meilleure nature, et non de nos défauts.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Bien-être Sociétal et Environnemental : La Sentinelle d&apos;un Avenir plus Serein</h3>
                        <p className="leading-relaxed text-gray-800">
                          L&apos;IA se doit d&apos;être une amie de la planète, durable, respectueuse, et œuvrant pour le bien de tous. Une vision à long terme, pour que l&apos;humanité ne se réveille pas un jour avec la gueule de bois.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section Applicabilité */}
                  <section id="applicabilite" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/compass-icon.png" alt="Boussole" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Applicabilité et Portée : Qui est Concerné ?</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Ce règlement a la vue large, balayant les frontières. Que vous soyez à Paris ou à l&apos;autre bout du monde, si votre IA touche un citoyen européen, l&apos;AI Act vous regarde. C&apos;est une portée universelle, à l&apos;image des rêves les plus audacieux. Mais comme toute règle, il y a des exceptions, des recoins où la loi ne s&apos;aventure pas, pour l&apos;instant : l&apos;IA militaire, la recherche pure, l&apos;usage strictement personnel (car notre jardin secret reste inviolable), et les systèmes en &quot;open source&quot; – à moins qu&apos;ils ne deviennent trop… menaçants.
                    </p>
                  </section>

                  {/* Section GPAI */}
                  <section id="gpai" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/technology.png" alt="Technologie" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Les Modèles GPAI : Les Géants sous Surveillance</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      L&apos;AI Act a vu venir les grands modèles linguistiques (LLM), ces monstres polymorphes capables de tout et de rien. Pour eux, des règles spécifiques : documentation claire, transparence sur leurs capacités et leurs limites, et surtout, respect du droit d&apos;auteur. Pas question de piller les chefs-d&apos;œuvre sans vergogne ! Les modèles les plus puissants, ceux qui ont un &quot;risque systémique&quot;, sont soumis à un examen plus approfondi, sous l&apos;œil vigilant du nouveau Bureau de l&apos;IA, ce chef d&apos;orchestre des intelligences naissantes.
                    </p>
                  </section>

                  {/* Section Gouvernance */}
                  <section id="gouvernance" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/withdraw.png" alt="Sanction" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">La Gouvernance et les Sanctions : La Main de Fer dans le Gant de Soie</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      L&apos;Europe a mis en place une double sentinelle. Au niveau national, chaque État membre veille au grain. Au niveau de l&apos;Union, le Bureau européen de l&apos;IA, né en février 2024, surveille les plus puissants. Et pour ceux qui s&apos;aviseraient de ne pas jouer le jeu, les sanctions sont salées : jusqu&apos;à 35 millions d&apos;euros ou 7% du chiffre d&apos;affaires mondial pour les fautes les plus graves. De quoi faire réfléchir les plus audacieux.
                    </p>
                    <div className="mt-6 text-center">
                      <a 
                        href="/ia-act-ue/calendrier" 
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-6 py-3 rounded-lg transition-colors"
                      >
                        Calendrier IA Act
                      </a>
                    </div>
                  </section>

                  {/* Section Bacs à Sable */}
                  <section id="bacs-a-sable" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/sandbox.png" alt="Bac à sable" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Les Bacs à Sable Réglementaires : Le Laboratoire de l&apos;Avenir</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Pour éviter de brider la créativité, l&apos;AI Act a prévu des &quot;bacs à sable réglementaires&quot;. Des espaces protégés où l&apos;IA peut grandir, expérimenter, et se perfectionner, sous le regard bienveillant de la loi. Une sorte de jardin d&apos;enfants pour intelligences artificielles, pour qu&apos;elles apprennent à être sages avant de se jeter dans la grande mare aux requins.
                    </p>
                  </section>

                  {/* Section Défis */}
                  <section id="defis" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/level-up.png" alt="Défi" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Défis et Impacts : L&apos;Art de l&apos;Équilibre</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Certes, l&apos;AI Act est une avancée majeure. Mais le chemin est encore semé d&apos;embûches. Il faudra interpréter, affiner, inventer de nouveaux outils pour mesurer l&apos;ineffable, comme l&apos;explicabilité ou la corrigibilité de l&apos;IA. Les modèles actuels, avec leurs imperfections, nous rappellent que l&apos;IA a encore beaucoup à apprendre de l&apos;humanité. Cet Acte, en somme, est un appel à la dignité, un effort pour que l&apos;IA, cette créature de nos mains, ne finisse pas par nous échapper, mais devienne, un jour, une amie de l&apos;homme.
                    </p>
                  </section>

                  {/* Call to Action */}
                  <div className="text-center mt-16 p-8 bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Prêt à naviguer dans l&apos;univers de l&apos;IA Act ?
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Découvrez nos outils pour vous accompagner dans votre démarche de conformité
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a 
                        href="/ia-act-ue/risques" 
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Voir la pyramide des risques
                      </a>
                      <a 
                        href="/ia-act-ue/calendrier" 
                        className="inline-flex items-center justify-center border border-[#0080a3] text-[#0080a3] hover:bg-[#0080a3] hover:text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Consulter le calendrier
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 