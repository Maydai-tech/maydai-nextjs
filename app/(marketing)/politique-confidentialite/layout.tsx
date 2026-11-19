import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Politique de Confidentialité | MaydAI - Protection de vos Données",
  description: "Consultez la politique de confidentialité de MaydAI. Nous nous engageons à protéger vos données personnelles conformément au RGPD. Découvrez vos droits et comment nous les protégeons.",
  keywords: "politique confidentialité, RGPD, protection données, MaydAI, données personnelles, droits utilisateur",
  robots: "index, follow",
  alternates: {
    canonical: 'https://www.maydai.io/politique-confidentialite',
  },
  openGraph: {
    title: "Politique de Confidentialité | MaydAI - Protection de vos Données",
    description: "Consultez la politique de confidentialité de MaydAI. Nous nous engageons à protéger vos données personnelles conformément au RGPD.",
    url: 'https://www.maydai.io/politique-confidentialite',
    type: 'website',
  },
};

export default function PolitiqueConfidentialiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 