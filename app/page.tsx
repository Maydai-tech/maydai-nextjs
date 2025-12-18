import Header from '@/components/site-vitrine/Header';
import HeroSection from '@/components/site-vitrine/HeroSection';
import TechnologiesSection from '@/components/site-vitrine/TechnologiesSection';
import FeaturesSection from '@/components/site-vitrine/FeaturesSection';
import MistralDashboard from '@/components/MistralDashboard';
import AuditAIActCompliance from '@/components/AuditAIActCompliance';
import TestimonialsSection from '@/components/site-vitrine/TestimonialsSection';
import Footer from '@/components/site-vitrine/Footer';

export const metadata = {
  title: 'MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté & Gestion Centralisée',
  description: 'MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l\'AI Act européen. Audit assisté, classification des risques, aides à la génération de documentation et accompagnement expert pour développer des systèmes d\'IA en toute confiance.',
  keywords: 'Audit AI Act, conformité IA, AI Act compliance, plateforme AI Act, réglementation européenne IA, logiciel conformité AI Act, outil analyse risque IA, checklist conformité AI Act, sanctions AI Act, comment se conformer à l\'AI Act',
  alternates: {
    canonical: 'https://www.maydai.io/',
  },
  openGraph: {
    title: 'MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté',
    description: 'MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l\'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert pour développer des systèmes d\'IA en toute confiance.',
    url: 'https://www.maydai.io/',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'MaydAI',
    images: [
      {
        url: '/content/open_graph_maydai.png',
        width: 1200,
        height: 630,
        alt: 'MaydAI - Plateforme de Conformité AI Act Européen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@maydai_io',
    creator: '@maydai_io',
    title: 'MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté',
    description: 'MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l\'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert.',
    images: ['/content/open_graph_maydai.png'],
  },
};

export default function HomePage() {
  // Données structurées JSON-LD pour l'organisation
  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MaydAI",
    "url": "https://www.maydai.io",
    "logo": "https://www.maydai.io/logos/logo-maydai/logo-maydai.png",
    "description": "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Grâce à notre audit assisté et notre gestion centralisée, nous permettons aux entreprises de développer et déployer des systèmes d'IA en toute confiance.",
    "foundingDate": "2025",
    "industry": ["Intelligence Artificielle", "Conformité Réglementaire", "LegalTech"],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Paris",
      "addressCountry": "FR"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+33-7-68-93-91-16",
      "contactType": "customer service",
      "email": "tech@maydai.io"
    },
    "sameAs": [
      "https://www.maydai.io"
    ]
  };

  // Données structurées JSON-LD pour l'application logicielle
  const softwareApplicationStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MaydAI - Plateforme de Conformité AI Act",
    "description": "Plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert pour développer des systèmes d'IA en toute confiance.",
    "url": "https://www.maydai.io",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR",
      "description": "Audit AI Act gratuit disponible"
    },
    "featureList": [
      "Audit de Conformité Automatisé",
      "Tableau de Bord de Conformité",
      "Génération de Documentation Technique",
      "Classification des Risques de l'IA",
      "Suivi des Exigences Réglementaires",
      "Plan d'Action Personnalisé",
      "Accompagnement par des Experts"
    ],
    "provider": {
      "@type": "Organization",
      "name": "MaydAI",
      "url": "https://www.maydai.io"
    }
  };

  // Données structurées JSON-LD pour les FAQ
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Qu'est-ce que l'AI Act et mon entreprise est-elle concernée ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "L'AI Act est la première réglementation mondiale sur l'intelligence artificielle adoptée par l'Union Européenne. Elle s'applique à toutes les entreprises qui développent, déploient ou utilisent des systèmes d'IA dans l'UE, quel que soit leur taille. MaydAI vous aide à déterminer si votre entreprise est concernée et à quel niveau de risque."
        }
      },
      {
        "@type": "Question",
        "name": "Comment MaydAI simplifie-t-il le processus d'audit de conformité ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "MaydAI automatise l'analyse de conformité grâce à notre intelligence artificielle spécialisée. Notre plateforme analyse vos systèmes d'IA, identifie les écarts par rapport à l'AI Act, génère automatiquement la documentation requise et vous fournit un plan d'action personnalisé pour corriger les non-conformités."
        }
      },
      {
        "@type": "Question",
        "name": "Combien de temps faut-il pour réaliser un premier audit avec votre plateforme ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Un premier audit avec MaydAI peut être réalisé en quelques heures seulement. Notre processus automatisé analyse rapidement vos systèmes d'IA et génère un rapport détaillé avec des recommandations concrètes. L'audit complet dépend de la complexité de vos systèmes mais reste largement plus rapide qu'un audit manuel traditionnel."
        }
      },
      {
        "@type": "Question",
        "name": "Votre solution est-elle adaptée aux PME et aux startups ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolument ! MaydAI a été conçue pour être accessible aux entreprises de toutes tailles. Nous proposons des tarifs adaptés aux PME et startups, avec un audit gratuit pour commencer. Notre interface intuitive et notre accompagnement personnalisé permettent même aux petites structures de se conformer facilement à l'AI Act."
        }
      },
      {
        "@type": "Question",
        "name": "Quels sont les différents niveaux de tarification de MaydAI ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "MaydAI propose plusieurs formules adaptées à vos besoins : un audit gratuit pour commencer, des plans mensuels pour les entreprises régulières, et des solutions sur mesure pour les grandes organisations. Tous nos plans incluent l'audit automatisé, la génération de documentation et l'accès à notre support expert."
        }
      }
    ]
  };

  return (
    <>
      {/* Données structurées JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationStructuredData)
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData)
        }}
      />
      
      <Header />
      <main>
        <HeroSection />
        <TechnologiesSection />
        <FeaturesSection />
        <MistralDashboard />
        <AuditAIActCompliance />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
