import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact - Rejoignez les Bêta-Testeurs MaydAI et l'Expertise IA Act",
  description: "Contactez MaydAI pour rejoindre notre communauté de bêta-testeurs. Contribuez à l'évolution de notre plateforme IA et à son analyse de l'IA Act.",
  keywords: "MaydAI, IA Act, bêta-testeurs, contact, intelligence artificielle, conformité IA",
  openGraph: {
    title: "Contact - Rejoignez les Bêta-Testeurs MaydAI et l'Expertise IA Act",
    description: "Contactez MaydAI pour rejoindre notre communauté de bêta-testeurs. Contribuez à l'évolution de notre plateforme IA et à son analyse de l'IA Act.",
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