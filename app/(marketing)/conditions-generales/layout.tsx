import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales de Vente et d'Utilisation (CGV/CGU) | MaydAI",
  description: "Consultez les conditions générales de vente et d'utilisation de la plateforme MaydAI.io. Découvrez nos termes pour les offres payantes et l'offre Freemium, nos engagements et limitations de responsabilité.",
  keywords: "conditions générales, CGV, CGU, MaydAI, SaaS, AI Act, conformité IA, abonnement, freemium, termes conditions",
  robots: "index, follow",
  alternates: {
    canonical: 'https://www.maydai.io/conditions-generales',
  },
  openGraph: {
    title: "Conditions Générales de Vente et d'Utilisation (CGV/CGU) | MaydAI",
    description: "Consultez les conditions générales de vente et d'utilisation de la plateforme MaydAI.io. Découvrez nos termes pour les offres payantes et l'offre Freemium.",
    url: 'https://www.maydai.io/conditions-generales',
    type: 'website',
  },
};

export default function ConditionsGeneralesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 