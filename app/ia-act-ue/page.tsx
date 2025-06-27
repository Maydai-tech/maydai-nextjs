import type { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "IA Act UE : Comprendre la Réglementation Européenne sur l'Intelligence Artificielle | MaydAI.io",
  description: "Découvrez l'IA Act UE, la première réglementation mondiale sur l'intelligence artificielle. Comprenez sa classification des risques, ses principes clés et son impact sur le développement de l'IA.",
  alternates: {
    canonical: '/ia-act-ue',
  },
  openGraph: {
    title: "IA Act UE : Comprendre la Réglementation Européenne sur l'Intelligence Artificielle | MaydAI.io",
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
    title: "IA Act UE : Comprendre la Réglementation Européenne sur l'Intelligence Artificielle | MaydAI.io",
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
          <article className="max-w-4xl mx-auto">
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
                  L'IA Act Européen : Guide Complet
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Découvrez tout ce que vous devez savoir sur la réglementation européenne de l'intelligence artificielle
                </p>
              </div>

              {/* Section Introduction */}
              <section className="mb-12">
                <p className="text-lg leading-relaxed mb-6">
                  L'AI Act européen représente une révolution dans la régulation de l'intelligence artificielle. Cette législation ambitieuse vise à créer un cadre harmonisé pour le développement et l'utilisation de l'IA dans l'Union européenne, tout en préservant l'innovation et en protégeant les droits fondamentaux.
                </p>
              </section>

              {/* Section Classification par Risques */}
              <section id="coeur-reacteur" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/risk.png" alt="Risque" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">La Classification par Risques : Le Cœur du Réacteur</h2>
                </div>
                <p>
                  L'AI Act fonctionne comme une pyramide à quatre niveaux, chacun avec ses propres règles et obligations. Cette approche basée sur les risques permet d'adapter les exigences à la criticité réelle des systèmes d'IA.
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li><strong>Risque Inacceptable :</strong> Systèmes interdits (manipulation comportementale, exploitation des vulnérabilités)</li>
                  <li><strong>Risque Élevé :</strong> Secteurs critiques nécessitant une conformité stricte (santé, transport, justice)</li>
                  <li><strong>Risque Limité :</strong> Obligations de transparence (chatbots, deepfakes)</li>
                  <li><strong>Risque Minimal :</strong> Aucune obligation spécifique</li>
                </ul>
              </section>

              {/* Section Objectifs et Principes */}
              <section id="poesie-droit" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/target.png" alt="Objectif" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">Objectifs et Principes : La Poésie du Droit</h2>
                </div>
                <p>
                  Plus qu'une simple réglementation, l'AI Act incarne une vision : celle d'une IA digne de confiance, respectueuse des valeurs européennes. Les principes fondamentaux incluent la transparence, la responsabilité, l'équité et le respect des droits fondamentaux.
                </p>
              </section>

              {/* Section Applicabilité */}
              <section id="applicabilite" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/compass-icon.png" alt="Boussole" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">Applicabilité et Portée : Qui est Concerné ?</h2>
                </div>
                <p>
                  L'AI Act s'applique à tous les acteurs de la chaîne de valeur de l'IA : fournisseurs, déployeurs, importateurs et distributeurs. Son champ d'application extraterritorial signifie que même les entreprises non-européennes sont concernées dès lors qu'elles proposent des systèmes d'IA sur le marché européen.
                </p>
              </section>

              {/* Section GPAI */}
              <section id="gpai" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/technology.png" alt="Technologie" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">Les Modèles GPAI : Les Géants sous Surveillance</h2>
                </div>
                <p>
                  Les modèles d'IA à usage général (GPAI) font l'objet d'une attention particulière. Les modèles les plus puissants (plus de 10^25 FLOPS) sont soumis à des obligations renforcées : évaluation des risques systémiques, tests adverses, rapports d'incidents et mesures de cybersécurité.
                </p>
              </section>

              {/* Section Gouvernance */}
              <section id="gouvernance" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/withdraw.png" alt="Sanction" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">La Gouvernance et les Sanctions : La Main de Fer dans le Gant de Soie</h2>
                </div>
                <p>
                  L'Europe a mis en place une double sentinelle. Au niveau national, chaque État membre veille au grain. Au niveau de l'Union, le Bureau européen de l'IA, né en février 2024, surveille les plus puissants. Et pour ceux qui s'aviseraient de ne pas jouer le jeu, les sanctions sont salées : jusqu'à 35 millions d'euros ou 7% du chiffre d'affaires mondial pour les fautes les plus graves. De quoi faire réfléchir les plus audacieux.
                </p>
              </section>

              {/* Section Bacs à Sable */}
              <section id="bacs-a-sable" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/sandbox.png" alt="Bac à sable" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">Les Bacs à Sable Réglementaires : Le Laboratoire de l'Avenir</h2>
                </div>
                <p>
                  Pour éviter de brider la créativité, l'AI Act a prévu des "bacs à sable réglementaires". Des espaces protégés où l'IA peut grandir, expérimenter, et se perfectionner, sous le regard bienveillant de la loi. Une sorte de jardin d'enfants pour intelligences artificielles, pour qu'elles apprennent à être sages avant de se jeter dans la grande mare aux requins.
                </p>
              </section>

              {/* Section Défis */}
              <section id="defis" className="mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <Image src="/icons/level-up.png" alt="Défi" width={36} height={36} className="w-9 h-9" />
                  <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">Défis et Impacts : L'Art de l'Équilibre</h2>
                </div>
                <p>
                  L'AI Act représente un défi majeur : comment réguler une technologie en perpétuelle évolution sans freiner l'innovation ? L'impact sur l'écosystème européen sera considérable, nécessitant des investissements importants en conformité mais ouvrant aussi de nouvelles opportunités pour les entreprises qui sauront s'adapter.
                </p>
              </section>

              {/* Call to Action */}
              <div className="text-center mt-16 p-8 bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Prêt à naviguer dans l'univers de l'IA Act ?
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
      </main>
      <Footer />
    </div>
  );
} 