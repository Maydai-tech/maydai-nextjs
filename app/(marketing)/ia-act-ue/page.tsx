import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'IA Act (AI Act) : Guide Complet & Résumé du Règlement Européen | MaydAI',
  description:
    "Découvrez le guide complet et le résumé de l'IA Act (AI Act) européen. Comprenez la réglementation, la classification des risques et vos obligations de conformité.",
  alternates: {
    canonical: 'https://www.maydai.io/ia-act-ue',
  },
  openGraph: {
    title: 'IA Act (AI Act) : Guide Complet & Résumé du Règlement Européen | MaydAI',
    description:
      "Découvrez le guide complet et le résumé de l'IA Act (AI Act) européen. Comprenez la réglementation, la classification des risques et vos obligations de conformité.",
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
    title: 'IA Act (AI Act) : Guide Complet & Résumé du Règlement Européen | MaydAI',
    description:
      "Découvrez le guide complet et le résumé de l'IA Act (AI Act) européen. Comprenez la réglementation, la classification des risques et vos obligations de conformité.",
    images: ['/eu-parlement-ai-act.jpg'],
  },
};

export default function IAActUEPage() {
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: "IA Act (AI Act) : Guide complet et résumé du règlement européen sur l'IA",
    description:
      "Comprendre le règlement européen sur l'intelligence artificielle (IA Act UE). Analyse des niveaux de risques, obligations de conformité, modèles GPAI et sanctions financières.",
    author: {
      '@type': 'Organization',
      name: 'MaydAI',
      url: 'https://www.maydai.io',
    },
    datePublished: '2024-03-13T08:00:00+01:00',
    dateModified: '2026-06-14T10:00:00+01:00',
    url: 'https://www.maydai.io/ia-act-ue',
    inLanguage: 'fr-FR',
    mainEntityOfPage: 'https://www.maydai.io/ia-act-ue',
    publisher: {
      '@type': 'Organization',
      name: 'MaydAI',
      url: 'https://www.maydai.io',
    },
  }

  return (
    <div className="bg-white">
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        <div className="container mx-auto px-4 py-8 sm:py-16">
          <div className="max-w-7xl mx-auto">
            {/* Layout avec sidebar */}
            <div className="flex gap-8">
              {/* Table des matières - Sidebar gauche */}
              <aside className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-8">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <p className="text-lg font-bold text-gray-900 mb-4">Table des matières</p>
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
                    priority
                    sizes="100vw"
                    style={{ objectFit: 'cover' }}
                    alt="Drapeaux de l'Union Européenne devant le bâtiment de la Commission Européenne" 
                  />
                </div>
                
                {/* Contenu principal */}
                <div className="prose prose-lg max-w-none">
                  {/* En-tête */}
                  <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                      IA Act (AI Act) : Guide complet et résumé du règlement européen sur l&apos;IA
                    </h1>
                  </div>

                  {/* Section Introduction */}
                  <section id="introduction" className="mb-12">
                    <h2 className="text-3xl font-bold text-[#0080a3] mb-6">Résumé de l&apos;IA Act : Le nouveau cadre réglementaire européen</h2>
                    <p className="text-lg leading-relaxed mb-6">
                      L&apos;<strong>IA Act UE</strong> (ou règlement européen sur l&apos;intelligence artificielle) est le premier cadre juridique complet au monde visant à encadrer le développement et le déploiement des systèmes d&apos;IA. Adopté par l&apos;Union européenne, ce texte classe les technologies selon quatre niveaux de risque et impose des obligations de transparence strictes pour garantir une IA éthique et sécurisée, sous peine de sanctions financières lourdes.
                    </p>
                  </section>

                  {/* Section Classification par Risques */}
                  <section id="coeur-reacteur" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/risk.png" alt="Risque" width={36} height={36} className="w-9 h-9" />
                      <h2 className="font-bold text-[17px] text-[#0080a3] mb-0">La classification des risques de l&apos;IA Act</h2>
                    </div>
                    <p>
                      L&apos;IA Act s&apos;appuie sur une classification stricte en quatre niveaux de risque. Cette approche proportionnée permet d&apos;adapter les exigences de conformité à la criticité réelle des cas d&apos;usage et à leur impact potentiel sur les droits fondamentaux.
                    </p>
                    <ul className="list-disc pl-6 mt-4 space-y-2">
                      <li><strong>Risque Inacceptable :</strong> Systèmes interdits (manipulation comportementale, exploitation des vulnérabilités)</li>
                      <li><strong>Risque Élevé :</strong> Secteurs critiques nécessitant une conformité stricte (santé, transport, justice)</li>
                      <li><strong>Risque Limité :</strong> Obligations de transparence (chatbots, deepfakes)</li>
                      <li><strong>Risque Minimal :</strong> Aucune obligation spécifique</li>
                    </ul>
                    <div className="mt-6 text-center">
                      <Link
                        href="/ia-act-ue/risques"
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-6 py-3 rounded-lg transition-colors"
                      >
                        Pyramide Risques IA
                      </Link>
                    </div>
                  </section>

                  {/* Section Objectifs et Principes */}
                  <section id="poesie-droit" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/target.png" alt="Objectif" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Principes cardinaux de la gouvernance de l&apos;IA</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-8">
                      Le cadre réglementaire européen définit six principes fondamentaux devant guider tout le cycle de vie des systèmes d&apos;intelligence artificielle :
                    </p>

                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Contôle et supervision humaine</h3>
                        <p className="leading-relaxed text-gray-800">
                          L&apos;IA doit être conçue comme un outil d&apos;assistance, maintenant l&apos;humain au centre de la validation et des décisions critiques.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Robustesse technique et Sécurité</h3>
                        <p className="leading-relaxed text-gray-800">
                          Les architectures doivent être résilientes face aux pannes, aux erreurs de calcul et aux tentatives de cyberattaques.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Gestion des données et Vie privée</h3>
                        <p className="leading-relaxed text-gray-800">
                          Les jeux de données d&apos;entraînement doivent faire l&apos;objet d&apos;une gouvernance stricte, en totale conformité avec le RGPD.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Transparence et Explicabilité</h3>
                        <p className="leading-relaxed text-gray-800">
                          Les boîtes noires sont proscrites. Les utilisateurs doivent être informés lorsqu&apos;ils interagissent avec une IA, et la logique des décisions doit être traçable.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Équité et Non-discrimination</h3>
                        <p className="leading-relaxed text-gray-800">
                          Les algorithmes doivent être optimisés pour identifier, minimiser et corriger les biais discriminatoires.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Responsabilité environnementale et sociétale</h3>
                        <p className="leading-relaxed text-gray-800">
                          Le déploiement des modèles doit s&apos;inscrire dans une démarche de durabilité (Green IT) en évaluant leur empreinte carbone.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section Applicabilité */}
                  <section id="applicabilite" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/compass-icon.png" alt="Boussole" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Champ d&apos;application territorial et exemptions</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      L&apos;IA Act adopte une portée extraterritoriale : tout fournisseur, distributeur ou déployeur de solutions IA est soumis au texte dès lors que son système est mis sur le marché ou utilisé au sein de l&apos;Union européenne, indépendamment de son lieu d&apos;établissement géographique.
                      <br />
                      <br />
                      Les seules exemptions explicites concernent les systèmes d&apos;IA développés exclusivement à des fins militaires, de défense nationale ou de recherche scientifique fondamentale. Les modèles open-source bénéficient d&apos;allègements, sauf s&apos;ils présentent un risque systémique.
                    </p>
                  </section>

                  {/* Section GPAI */}
                  <section id="gpai" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/technology.png" alt="Technologie" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Régulation des modèles d&apos;IA à usage général (GPAI)</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Le texte encadre de manière spécifique les grands modèles de langage (LLM) et les modèles de fondation. Ces systèmes généralistes doivent fournir une documentation technique transparente, respecter le droit d&apos;auteur européen et publier un résumé clair des données utilisées pour leur entraînement. Les modèles les plus puissants, qualifiés à &quot;risque systémique&quot;, font l&apos;objet d&apos;audits et de rapports obligatoires sous la supervision directe du Bureau européen de l&apos;IA.
                    </p>
                  </section>

                  {/* Section Gouvernance */}
                  <section id="gouvernance" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/withdraw.png" alt="Sanction" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Autorités de contrôle et barème des sanctions</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      La conformité est surveillée à double échelle. Au niveau national, chaque État membre désigne ses propres autorités de contrôle. Au niveau de l&apos;Union, le Bureau européen de l&apos;IA centralise la régulation des technologies transverses.
                      <br />
                      <br />
                      Le barème des sanctions en cas d&apos;infraction est hautement dissuasif : les violations des pratiques interdites peuvent entraîner des amendes administratives allant jusqu&apos;à 35 millions d&apos;euros ou 7% du chiffre d&apos;affaires mondial annuel global de l&apos;entreprise.
                    </p>
                    <div className="mt-6 text-center">
                      <Link
                        href="/ia-act-ue/calendrier"
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-6 py-3 rounded-lg transition-colors"
                      >
                        Calendrier IA Act
                      </Link>
                    </div>
                  </section>

                  {/* Section Bacs à Sable */}
                  <section id="bacs-a-sable" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/sandbox.png" alt="Bac à sable" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Bacs à sable réglementaires : Stimuler l&apos;innovation</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      Afin de préserver la compétitivité et de soutenir les start-ups, l&apos;IA Act impose la création de bacs à sable réglementaires (regulatory sandboxes) au niveau national. Ces environnements d&apos;expérimentation sécurisés permettent aux entreprises de tester leurs innovations en conditions réelles sous la supervision bienveillante des régulateurs, facilitant leur mise en conformité avant commercialisation.
                    </p>
                  </section>

                  {/* Section Défis */}
                  <section id="defis" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/level-up.png" alt="Défi" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Défis opérationnels et perspectives d&apos;avenir</h2>
                    </div>
                    <p className="text-lg leading-relaxed">
                      L&apos;application de l&apos;IA Act implique des transformations opérationnelles profondes pour l&apos;écosystème tech. Standardiser et mesurer des critères complexes tels que l&apos;explicabilité algorithmique ou la traçabilité des données d&apos;entraînement reste un défi technique. L&apos;enjeu pour les organisations est de transformer cette contrainte légale en un actif stratégique, garantissant la confiance de leurs utilisateurs et la durabilité de leurs solutions.
                    </p>
                  </section>

                  {/* Call to Action */}
                  <div className="text-center mt-16 p-8 bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl">
                    <p className="text-2xl font-bold text-gray-900 mb-4">
                      Prêt à naviguer dans l&apos;univers de l&apos;IA Act ?
                    </p>
                    <p className="text-gray-600 mb-6">
                      Découvrez nos outils pour vous accompagner dans votre démarche de conformité
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <Link
                        href="/signup?utm_source=maydai_website&utm_medium=cta_button&utm_campaign=guide_ia_act_page"
                        className="inline-flex items-center justify-center bg-[#ffab5a] text-white font-bold px-8 py-3 rounded-xl transition-all"
                      >
                        Créer mon registre IA gratuitement
                      </Link>
                      <Link
                        href="/ia-act-ue/risques"
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Voir la pyramide des risques
                      </Link>
                      <Link
                        href="/ia-act-ue/calendrier"
                        className="inline-flex items-center justify-center border border-[#0080a3] text-[#0080a3] hover:bg-[#0080a3] hover:text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Consulter le calendrier de l&apos;IA Act
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 