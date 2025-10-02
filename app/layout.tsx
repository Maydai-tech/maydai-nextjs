import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ConditionalLayout from "@/components/ConditionalLayout";
import GlobalLoader from "@/components/GlobalLoader";
import SmartLoader from "@/components/SmartLoader";
import { getNonce } from "@/lib/csp-nonce";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Automatisé",
  description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit automatisé, gestion centralisée et accompagnement expert pour développer des systèmes d'IA en toute confiance.",
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
    title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Automatisé",
    description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit automatisé, gestion centralisée et accompagnement expert.",
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
    title: "MaydAI - Plateforme de Conformité AI Act | Audit IA Automatisé",
    description: "MaydAI est la plateforme SaaS qui simplifie la mise en conformité avec l'AI Act européen. Audit automatisé, gestion centralisée et accompagnement expert.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce()
  
  return (
    <html lang="fr">
      <head>
        {/* Meta pour exposer le nonce au client */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        {/* Google Consent Mode Script - Doit être chargé AVANT GTM */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="google-consent-mode"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent', 'default', {
                  ad_storage: 'denied',
                  ad_user_data: 'denied', 
                  ad_personalization: 'denied',
                  analytics_storage: 'denied',
                  functionality_storage: 'denied',
                  personalization_storage: 'denied',
                  security_storage: 'granted',
                  wait_for_update: 2000,
                });
                gtag('set', 'ads_data_redaction', true);
                gtag('set', 'url_passthrough', true);
              `,
            }}
          />
        )}

        {/* Google Tag Manager - Seulement en production */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-KLSD6BXG');
              `,
            }}
          />
        )}


      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {/* Google Tag Manager (noscript) - Seulement en production */}
        {process.env.NODE_ENV === 'production' && (
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-KLSD6BXG"
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        
        <AuthProvider>
          <SmartLoader>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </SmartLoader>
        </AuthProvider>
      </body>
    </html>
  );
}
