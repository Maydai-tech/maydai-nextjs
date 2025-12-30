import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Sécurité MaydAI | Infrastructure Souveraine & Protection des Données",
  description: "Découvrez les garanties de sécurité MaydAI : hébergement 100% français sur OVHcloud, certifications ISO 27001, SOC 2, conformité RGPD et protection de vos données stratégiques.",
  keywords: "sécurité IA, hébergement France, OVHcloud, ISO 27001, SOC 2, RGPD, protection données, souveraineté numérique, Cloud Act, infrastructure européenne",
  alternates: {
    canonical: 'https://www.maydai.io/securite',
  },
  openGraph: {
    title: "Sécurité MaydAI | Infrastructure Souveraine & Protection des Données",
    description: "Découvrez les garanties de sécurité MaydAI : hébergement 100% français sur OVHcloud, certifications ISO 27001, SOC 2, conformité RGPD et protection de vos données stratégiques.",
    url: 'https://www.maydai.io/securite',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sécurité MaydAI | Infrastructure Souveraine & Protection des Données",
    description: "Découvrez les garanties de sécurité MaydAI : hébergement 100% français sur OVHcloud, certifications ISO 27001, SOC 2, conformité RGPD.",
  },
};

export default function SecuriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

