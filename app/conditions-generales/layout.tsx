import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation (CGU) | MaydAI",
  description: "Consultez les conditions générales d'utilisation du site MaydAI.io. En utilisant notre site, vous acceptez nos termes sur la propriété intellectuelle, l'utilisation du site et plus.",
  keywords: "conditions générales, CGU, MaydAI, utilisation site, propriété intellectuelle, termes conditions",
  robots: "index, follow",
  alternates: {
    canonical: 'https://www.maydai.io/conditions-generales',
  },
  openGraph: {
    title: "Conditions Générales d'Utilisation (CGU) | MaydAI",
    description: "Consultez les conditions générales d'utilisation du site MaydAI.io. En utilisant notre site, vous acceptez nos termes sur la propriété intellectuelle.",
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