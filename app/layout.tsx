import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ConditionalLayout from "@/components/ConditionalLayout";
import DeferredGoogleTagManager from "@/components/DeferredGoogleTagManager";
import SmartLoader from "@/components/SmartLoader";
import { getNonce } from "@/lib/csp-nonce";
import GTMPageViewTracker from "@/components/GTMPageViewTracker";
import HubSpotTrigger from "@/components/tracking/HubSpotTrigger";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

/** Conteneur GTM unique — Analytics / Ads sont chargés via ce conteneur uniquement. */
const GTM_CONTAINER_ID = "GTM-KLSD6BXG";

/** Hôtes considérés comme la prod « officielle » (hors Vercel). */
const OFFICIAL_GTM_HOSTS = new Set(["maydai.io", "www.maydai.io"]);

/**
 * GTM uniquement sur la prod réelle : déploiement Vercel « Production » ou domaine canonique,
 * pour exclure preview (.vercel.app), localhost et next start local.
 */
async function shouldLoadOfficialGTM(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;

  if (process.env.VERCEL) {
    return process.env.VERCEL_ENV === "production";
  }

  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return true;
  }

  const headersList = await headers();
  const rawHost =
    headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headersList.get("host") ??
    "";
  const host = rawHost.split(":")[0]?.toLowerCase() ?? "";
  if (!host) return false;
  return OFFICIAL_GTM_HOSTS.has(host);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getNonce();
  const loadOfficialGTM = await shouldLoadOfficialGTM();

  return (
    <html lang="fr">
      <head>
        {/* Meta pour exposer le nonce au client */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        {/* Google Consent Mode (dataLayer uniquement, sans gtag.js GA/Ads) — avant GTM et CookieYes */}
        {loadOfficialGTM && (
          <Script
            id="google-consent-mode"
            strategy="beforeInteractive"
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
        {/* CookieYes — lazyOnload pour ne pas bloquer le LCP ; le consentement par défaut est déjà appliqué ci-dessus */}
        {loadOfficialGTM && process.env.NEXT_PUBLIC_COOKIEYES_ID && (
          <Script
            id="cookieyes"
            src={`https://cdn-cookieyes.com/client_data/${process.env.NEXT_PUBLIC_COOKIEYES_ID}/script.js`}
            strategy="lazyOnload"
            nonce={nonce}
          />
        )}

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {loadOfficialGTM && (
          <DeferredGoogleTagManager
            gtmId={GTM_CONTAINER_ID}
            nonce={nonce}
            safetyTimeoutMs={3000}
          />
        )}

        <AuthProvider>
          <GTMPageViewTracker />
          <HubSpotTrigger />
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
