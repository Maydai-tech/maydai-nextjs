import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté",
  description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert pour développer des systèmes d'IA en toute confiance.",
  keywords: "Audit AI Act, conformité IA, AI Act compliance, plateforme AI Act, réglementation européenne IA, logiciel conformité AI Act, outil analyse risque IA",
  authors: [{ name: "MaydAI", url: "https://www.maydai.io" }],
  creator: "MaydAI",
  publisher: "MaydAI",
  robots: "index, follow",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maydai.io'),
  alternates: {
    canonical: "https://www.maydai.io",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.maydai.io",
    siteName: "MaydAI",
    title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté",
    description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert.",
    images: [
      {
        url: "/content/open_graph_maydai.png",
        width: 1200,
        height: 630,
        alt: "MaydAI - Plateforme de Conformité AI Act Européen",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@maydai_io",
    creator: "@maydai_io",
    title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Assisté",
    description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit assisté, gestion centralisée et accompagnement expert.",
    images: ["/content/open_graph_maydai.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/logos/logo-maydai/icon-maydai.png", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: "/logos/logo-maydai/icon-maydai.png",
  },
};

/** Shell HTML global — providers délégués aux route groups (marketing) et (saas). */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.className} ${geistSans.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
