import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact MaydAI - Test Gratuit Audit IA Act & Conformité IA",
  description: "Contactez l'équipe MaydAI pour vos besoins en conformité IA. Profitez d'un test gratuit de notre outil d'audit IA Act. Support, presse et partenariats.",
  keywords: "test gratuit audit IA Act, contact MaydAI, conformité IA, registre IA gratuit, règlement européen IA",
  openGraph: {
    title: "Contact MaydAI - Test Gratuit Audit IA Act & Conformité IA",
    description: "Contactez l'équipe MaydAI pour vos besoins en conformité IA. Profitez d'un test gratuit de notre outil d'audit IA Act. Support, presse et partenariats.",
    type: 'website',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 