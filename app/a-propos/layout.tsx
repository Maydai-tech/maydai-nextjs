import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Notre Équipe d'Experts IA | Découvrez l'Équipe MaydAI",
  description: "Rencontrez l'équipe MaydAI. Nos experts, consultants et développeurs en IA vous accompagnent pour garantir le succès de vos projets.",
  keywords: "Entreprise MaydAI, équipe experts IA, consultants intelligence artificielle, développeurs IA, experts machine learning",
  openGraph: {
    title: "Notre Équipe d'Experts IA | Découvrez l'Équipe MaydAI",
    description: "Rencontrez l'équipe MaydAI. Nos experts, consultants et développeurs en IA vous accompagnent pour garantir le succès de vos projets.",
    type: 'website',
  },
  alternates: {
    canonical: '/a-propos',
  },
};

export default function AProposLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 