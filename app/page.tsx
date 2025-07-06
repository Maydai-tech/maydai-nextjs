import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import TechnologiesSection from '@/components/TechnologiesSection';
import FeaturesSection from '@/components/FeaturesSection';
import EvaluationCriteriaSection from '@/src/components/sections/EvaluationCriteriaSection';
import MistralDashboard from '@/components/MistralDashboard';
import AuditAIActCompliance from '@/components/AuditAIActCompliance';
import TestimonialsSection from '@/components/TestimonialsSection';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Audit AI Act avec MaydAI | Conformité IA Act & Audit IA',
  description: 'MaydAI vous accompagne pour l\'Audit AI Act : conformité, audit réglementaire, accompagnement expert et gestion simplifiée de l\'AI Act. Découvrez notre solution dédiée à l\'Audit AI Act.',
  keywords: 'Audit AI Act, MaydAI, conformité IA, audit réglementaire, AI Act compliance',
  openGraph: {
    title: 'Audit AI Act avec MaydAI',
    description: 'MaydAI, votre partenaire pour l\'Audit AI Act et la conformité réglementaire IA. Simplifiez et sécurisez votre conformité avec notre solution experte.',
  },
};

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <TechnologiesSection />
        <FeaturesSection />
        <EvaluationCriteriaSection />
        <MistralDashboard />
        <AuditAIActCompliance />
        <TestimonialsSection />
      </main>
      <Footer />
    </>
  );
}
