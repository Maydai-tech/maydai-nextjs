import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tarifs MaydAI | Audit IA Act Gratuit & Plans de Conformité",
  description: "Découvrez les tarifs de MaydAI. Commencez avec notre audit IA Act gratuit, choisissez un plan mensuel, ou demandez un devis sur mesure pour une conformité totale.",
  alternates: {
    canonical: 'https://www.maydai.io/tarifs',
  },
  openGraph: {
    title: "Tarifs MaydAI | Audit IA Act Gratuit & Plans de Conformité",
    description: "Découvrez les tarifs de MaydAI. Commencez avec notre audit IA Act gratuit, choisissez un plan mensuel, ou demandez un devis sur mesure pour une conformité totale.",
    url: 'https://www.maydai.io/tarifs',
  },
};

export default function TarifsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
