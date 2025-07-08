import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ConditionalLayout from "@/components/ConditionalLayout";
import GlobalLoader from "@/components/GlobalLoader";
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
  title: "Maydai - Audit AI Act",
  description: "Audit AI Act avec Maydai",
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

        {/* CookieYes Script - Bannière de consentement aux cookies */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="cookieyes-script"
            src="https://cdn-cookieyes.com/client_data/d7c0d5315d5927e305484578/script.js"
            strategy="afterInteractive"
            nonce={nonce}
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
          <GlobalLoader>
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </GlobalLoader>
        </AuthProvider>
      </body>
    </html>
  );
}
