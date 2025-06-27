import type { NextPage } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReactNode } from 'react';
import Image from 'next/image';

/*
  Suggestion de métadonnées pour le SEO (à placer dans le layout.tsx parent) :

  export const metadata = {
    title: "Fonctionnalités de la Plateforme IA Act MaydAI | Conformité & Gouvernance",
    description: "Découvrez comment notre Plateforme IA Act vous aide à naviguer les complexités de l'AI Act. De l'audit à la gouvernance, MaydAI est votre allié pour une IA de confiance.",
    alternates: {
      canonical: '/fonctionnalites',
    },
  };
*/

// Composant générique pour les icônes de section pour maintenir la cohérence
const FeatureIcon = ({ children }: { children: ReactNode }) => (
  <div className="text-[#0080a3] rounded-lg w-12 h-12 flex items-center justify-center mr-4 mb-4 lg:mb-0" style={{ backgroundColor: '#c6eef8' }}>
    {children}
  </div>
);

const FonctionnalitesPage: NextPage = () => {
  return (
    <div className="bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12 sm:py-16">
        {/* Contenu principal */}
        <div className="max-w-4xl mx-auto">
          {/* En-tête de la page */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Fonctionnalités de la Plateforme IA Act
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Découvrez comment MaydAI vous aide à naviguer les complexités de l'AI Act
            </p>
          </div>

          {/* Section Registre IA Act */}
          <section id="registre" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/feuille.png" alt="Registre" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Registre IA Act : Votre Carnet de Bord Numérique</h2>
            </div>
            <p>Imaginez un registre qui ne se contente pas de lister vos IA, mais qui les comprend, les analyse et vous guide. Notre registre IA Act transforme l'obligation légale en opportunité stratégique.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Classification Automatique :</strong> Nos algorithmes analysent vos cas d'usage et déterminent automatiquement le niveau de risque selon l'IA Act.</li>
              <li><strong>Documentation Dynamique :</strong> Chaque entrée se enrichit au fil de vos interactions, créant une documentation vivante et toujours à jour.</li>
              <li><strong>Tableaux de Bord Intuitifs :</strong> Visualisez votre patrimoine IA d'un coup d'œil avec des graphiques clairs et des indicateurs pertinents.</li>
            </ul>
          </section>

          {/* Section Audits IA Act */}
          <section id="audits" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/audit.png" alt="Audit" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Audits IA Act : L'Examen de Conscience Numérique</h2>
            </div>
            <p>Nos audits ne se contentent pas de cocher des cases. Ils plongent au cœur de vos systèmes pour révéler les subtilités que seul un œil expert peut déceler.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Questionnaires Adaptatifs :</strong> Nos questions s'ajustent en temps réel selon vos réponses, pour un audit personnalisé et pertinent.</li>
              <li><strong>Analyse Contextuelle :</strong> Chaque réponse est analysée dans son contexte métier pour des recommandations sur mesure.</li>
              <li><strong>Rapports Exécutifs :</strong> Des synthèses claires pour les dirigeants, des détails techniques pour les équipes.</li>
            </ul>
          </section>

          {/* Section Fiches Cas d'Usage */}
          <section id="fiches-usage" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/tag.png" alt="Cas d'usage" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Fiches Cas d'Usage : La Carte d'Identité de vos IA</h2>
            </div>
            <p>Chaque IA mérite sa propre histoire. Nos fiches de cas d'usage racontent cette histoire avec précision et élégance, transformant la complexité technique en narration claire.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Profils Détaillés :</strong> De la conception à l'utilisation, chaque aspect de votre IA est documenté avec soin.</li>
              <li><strong>Traçabilité Complète :</strong> Suivez l'évolution de vos cas d'usage à travers le temps et les versions.</li>
              <li><strong>Collaboration Facilitée :</strong> Partagez et collaborez sur vos fiches avec vos équipes en toute simplicité.</li>
            </ul>
          </section>

          {/* Section Transparence et Conformité */}
          <section id="transparence" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/Transpararency.png" alt="Transparence" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Transparence et Conformité : La Lumière qui Guide</h2>
            </div>
            <p>La transparence n'est pas qu'une obligation, c'est une philosophie. Nos outils vous aident à embrasser cette transparence et à en faire un avantage concurrentiel.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Documentation Automatique :</strong> Générez automatiquement les documents de transparence requis par l'IA Act.</li>
              <li><strong>Suivi de Conformité :</strong> Surveillez votre niveau de conformité en temps réel avec des alertes proactives.</li>
              <li><strong>Communication Publique :</strong> Préparez vos communications externes avec des outils dédiés à la transparence.</li>
            </ul>
          </section>

          {/* Section Dashboard Entreprise */}
          <section id="dashboard" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/dashboard.png" alt="Dashboard" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Dashboard Entreprise : Le Tableau de Bord du Capitaine</h2>
            </div>
            <p>Diriger, c'est d'abord comprendre. Notre tableau de bord centralise votre patrimoine IA et vous offre une vision stratégique pour piloter votre programme de conformité avec l'agilité d'un danseur étoile.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Vision d'Ensemble :</strong> Agrégez toutes les informations de votre patrimoine IA en un seul point.</li>
              <li><strong>Suivi en Temps Réel :</strong> Gardez un œil sur l'avancement des plans de remédiation et des scores de conformité.</li>
              <li><strong>Rapports Stratégiques :</strong> Anticipez les risques, identifiez les opportunités et optimisez votre gestion des modèles.</li>
            </ul>
          </section>

          {/* Section Vérification et Validation */}
          <section id="verification" className="mb-16 scroll-mt-24">
            <div className="flex flex-col lg:flex-row items-center mb-4">
              <FeatureIcon>
                <Image src="/icons/evaluation.png" alt="Évaluation" width={36} height={36} className="w-9 h-9" />
              </FeatureIcon>
              <h2 className="text-[#0080a3] font-bold text-[17px]">Vérification et Validation : Le Sceau de l'Excellence</h2>
            </div>
            <p>La validation n'est pas la fin du processus, c'est le début de la confiance. Nos outils de vérification transforment l'incertitude en certitude, le doute en assurance.</p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Tests Automatisés :</strong> Validez automatiquement la conformité de vos systèmes avec des batteries de tests prédéfinies.</li>
              <li><strong>Certification Assistée :</strong> Préparez vos dossiers de certification avec des guides étape par étape.</li>
              <li><strong>Suivi Post-Déploiement :</strong> Surveillez la performance et la conformité de vos IA une fois en production.</li>
            </ul>
          </section>

          {/* Call to Action */}
          <div className="text-center mt-16 p-8 bg-gradient-to-r from-[#0080a3]/10 to-blue-50 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Prêt à transformer votre approche de l'IA Act ?
            </h3>
            <p className="text-gray-600 mb-6">
              Découvrez comment MaydAI peut simplifier votre parcours de conformité
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
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FonctionnalitesPage; 