import type { Metadata } from 'next';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "MaydAI : Votre Plateforme IA Act pour une IA Digne de Confiance | Fonctionnalités",
  description: "Découvrez comment notre Plateforme IA Act vous aide à naviguer les complexités de l'AI Act. De l'audit à la gouvernance, MaydAI est votre allié pour une IA de confiance.",
  alternates: {
    canonical: 'https://www.maydai.io/fonctionnalites',
  },
  openGraph: {
    title: "MaydAI : Votre Plateforme IA Act pour une IA Digne de Confiance | Fonctionnalités",
    description: "Découvrez comment notre Plateforme IA Act vous aide à naviguer les complexités de l'AI Act. De l'audit à la gouvernance, MaydAI est votre allié pour une IA de confiance.",
    url: 'https://www.maydai.io/fonctionnalites',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "MaydAI : Votre Plateforme IA Act pour une IA Digne de Confiance | Fonctionnalités",
    description: "Découvrez comment notre Plateforme IA Act vous aide à naviguer les complexités de l'AI Act. De l'audit à la gouvernance, MaydAI est votre allié pour une IA de confiance.",
  },
};

export default function FonctionnalitesPage() {
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Fonctionnalités</h3>
                    <nav className="space-y-2">
                      <a href="#introduction" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Introduction
                      </a>
                      <a href="#registre" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Registre IA Act
                      </a>
                      <a href="#audits" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Audits IA Act
                      </a>
                      <a href="#fiches-usage" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Fiches Cas d'Usage
                      </a>
                      <a href="#transparence" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Transparence et Conformité
                      </a>
                      <a href="#dashboard" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Dashboard Entreprise
                      </a>
                      <a href="#verification" className="block text-sm text-gray-600 hover:text-[#0080a3] hover:bg-white rounded-lg px-3 py-2 transition-colors">
                        Vérification et Validation
                      </a>
                    </nav>
                  </div>
                </div>
              </aside>

              {/* Contenu principal */}
              <article className="flex-1 min-w-0">
                {/* Contenu principal */}
                <div className="prose prose-lg max-w-none">
                  {/* En-tête */}
                  <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                      MaydAI : Votre Plateforme IA Act pour une IA Digne de Confiance
                    </h1>
                  </div>

                  {/* Section Introduction */}
                  <section id="introduction" className="mb-12">
                    <h2 className="text-3xl font-bold text-[#0080a3] mb-6">L'Architecte de Confiance dans l'Univers de l&apos;IA Act</h2>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      MaydAI, c'est l'architecte de confiance pour naviguer dans les méandres de l'AI Act européen, ce texte pionnier qui s'élève comme le seul et unique phare réglementaire mondial pour l'intelligence artificielle. Notre <strong>Plateforme IA Act</strong>, nourrie de deux ans d'expertise et de recherches scientifiques, protège les citoyens, la démocratie et la liberté face aux périls de l'IA en assurant une conformité rigoureuse.
                    </p>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Imaginez une forteresse numérique où chaque système d'IA de votre entreprise est connu, compris, et maîtrisé. MaydAI, la <strong>Plateforme IA Act</strong>, vous offre cette quiétude. Au cœur de MaydAI, une approche méthodique et collaborative qui transforme l'obligation légale en opportunité stratégique.
                    </p>
                  </section>

                  {/* Section Registre IA Act */}
                  <section id="registre" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/bank.png" alt="Registre" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Registre IA Act : Votre Carnet de Bord Numérique</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      C'est le point de départ : un inventaire exhaustif de tous vos systèmes d'IA et de leurs usages. Notre <strong>Plateforme IA Act</strong> transforme ce registre en bien plus qu'une simple liste – c'est une cartographie vivante de votre patrimoine numérique.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Le Panthéon de vos IA</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Hiérarchisation intelligente :</strong> Modèles prêts à l'emploi pour une mise en place accélérée, parce que le temps, c&apos;est de l'argent, même dans le monde de l&apos;IA</li>
                          <li><strong>Suivi du cycle de vie :</strong> Du balbutiement du projet jusqu&apos;au déploiement final, car même une IA a son enfance et sa maturité</li>
                          <li><strong>Gestion automatisée :</strong> Tâches et revues régulières avec des règles automatiques, pour que la conformité soit une mélodie continue et non un requiem</li>
                          <li><strong>Intégration cartographique :</strong> Référentiels communs avec le registre des traitements de données et l&apos;association aux actifs logiciels</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section Audits IA Act */}
                  <section id="audits" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/audit.png" alt="Audit" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Audits IA Act : L'Examen de Conscience Numérique</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Classification et évaluation de vos systèmes d'IA selon les standards européens. Nous combinons le niveau de risque avec l'évaluation de la valeur commerciale, pour que chaque effort soit mesuré.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">La Loupe du Conformiste</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Audit détaillé personnalisé :</strong> Évaluation de conformité, collecte des preuves, traçage des validations pour chaque cas d&apos;IA</li>
                          <li><strong>Questionnaire structuré :</strong> Reprend article par article les obligations de l&apos;AI Act pour un score de conformité précis</li>
                          <li><strong>Plans de remédiation :</strong> Définition et priorisation des actions correctives, parce que même les génies ont besoin de quelques coups de cravache</li>
                          <li><strong>Dossier technique :</strong> Outil clé pour constituer le dossier de certification des IA à haut risque</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section Fiches Cas d'Usage */}
                  <section id="fiches-usage" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/tag.png" alt="Cas d'usage" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Fiches Cas d'Usage : La Carte d&apos;Identité de vos IA</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Une approche structurée pour chaque cas d'usage, avec sa finalité, son périmètre, ses jalons, les réglementations applicables, et sa documentation technique. Chaque IA a son histoire, nous la racontons avec précision.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">Le Récit de vos Créations Numériques</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Identification précise :</strong> Cas d&apos;usage à haut risque détectés, mieux vaut anticiper les orages que de les subir</li>
                          <li><strong>Outils collaboratifs :</strong> Pilotage de la mise en conformité grâce à l&apos;inventaire et la qualification des cas d&apos;usage IA</li>
                          <li><strong>Évaluation des risques :</strong> Analyse approfondie des risques portés par chaque cas d&apos;usage</li>
                          <li><strong>Documentation vivante :</strong> Traçabilité complète du cycle de vie de chaque IA</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section Transparence et Conformité */}
                  <section id="transparence" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/Transpararency.png" alt="Transparence" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Transparence et Conformité : Le Pacte de Confiance</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Vos projets respectent les derniers standards, AI Act et NIST AI en tête, pour une conformité qui se veut irréprochable. Notre <strong>Plateforme IA Act</strong> fait de la transparence votre force.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">La Lumière qui Guide</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Exportation facilitée :</strong> Tous vos systèmes, audits et preuves de conformité, car la clarté est notre lumière</li>
                          <li><strong>Notices de transparence :</strong> Information claire des usagers, un gage d&apos;honnêteté envers ceux qui interagiront avec vos créations</li>
                          <li><strong>Surveillance post-déploiement :</strong> Mécanismes d&apos;identification des incidents, car la vigilance est la mère de la sûreté</li>
                          <li><strong>Revues programmées :</strong> Surveillance continue pour une conformité qui ne faillit jamais</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section Dashboard Entreprise */}
                  <section id="dashboard" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/dashboard.png" alt="Dashboard" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Dashboard Entreprise : Le Tableau de Bord du Capitaine</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Un outil central pour assembler toutes les informations de votre patrimoine IA, avec une vision d'ensemble de l'avancement du programme de conformité. Parce que diriger, c'est d'abord comprendre.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">La Vision Stratégique des Dirigeants</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Suivi temps réel :</strong> Plans de remédiation suivis avec une agilité digne d&apos;un danseur étoile</li>
                          <li><strong>Tableaux de bord intelligents :</strong> Anticipation des risques, identification des opportunités, optimisation stratégique</li>
                          <li><strong>Vision d&apos;ensemble :</strong> Combinaison d&apos;outils technologiques, évaluation des risques et gouvernance stratégique</li>
                          <li><strong>Rapports exécutifs :</strong> Synthèses pour la direction, détails pour les équipes techniques</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Section Vérification et Validation */}
                  <section id="verification" className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <Image src="/icons/evaluation.png" alt="Évaluation" width={36} height={36} className="w-9 h-9" />
                      <h2 className="text-3xl font-bold text-[#0080a3] mb-0">Vérification et Validation : Le Sceau de l&apos;Excellence</h2>
                    </div>
                    <p className="text-lg leading-relaxed mb-6 text-gray-800">
                      Classification et évaluation des risques, gouvernance des données, vérification des obligations de conformité. Notre <strong>Plateforme IA Act</strong> transforme l'incertitude en certitude, le doute en assurance.
                    </p>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold text-[#0080a3] mb-4">L'Excellence à Chaque Étape</h3>
                        <ul className="list-disc pl-6 space-y-2 text-gray-800">
                          <li><strong>Classification automatique :</strong> Évaluation et classification selon les exigences de l'AI Act UE, rationalisation de l&apos;évaluation IA tierce</li>
                          <li><strong>Gouvernance des données :</strong> Identification des risques dans les jeux de données, protection efficace du pipeline ML</li>
                          <li><strong>Conformité réglementaire :</strong> Documentation technique, supervision humaine, explicabilité et transparence</li>
                          <li><strong>Alertes intelligentes :</strong> Notifications de changements, mises à jour automatiques, déclenchement de tâches utilisateur</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  {/* Call to Action */}
                  <div className="text-center mt-16 p-8 bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      Prêt à faire de l'AI Act votre avantage concurrentiel ?
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Découvrez comment notre Plateforme IA Act peut transformer votre approche de l'IA
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <a 
                        href="/contact" 
                        className="inline-flex items-center justify-center bg-[#0080a3] hover:bg-[#006080] text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Commencer gratuitement
                      </a>
                      <a 
                        href="/contact" 
                        className="inline-flex items-center justify-center border border-[#0080a3] text-[#0080a3] hover:bg-[#0080a3] hover:text-white font-bold px-8 py-3 rounded-lg transition-colors"
                      >
                        Demander une démo
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