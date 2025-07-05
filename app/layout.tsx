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
        
        {/* CookieYes - Bannière de cookies RGPD */}
        {process.env.NEXT_PUBLIC_COOKIEYES_ID && (
          <Script
            id="cookieyes-script"
            src={`https://cdn-cookieyes.com/client_data/${process.env.NEXT_PUBLIC_COOKIEYES_ID}/script.js`}
            strategy="afterInteractive"
            nonce={nonce}
          />
        )}
        
        {/* Google Tag Manager - Seulement en production avec consentement */}
        {process.env.NODE_ENV === 'production' && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                // Attendre le consentement CookieYes avant de charger GTM
                function initGTM() {
                  if (window.gtag) return; // Éviter la double initialisation
                  
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','GTM-KLSD6BXG');
                }
                
                // Écouter les événements de consentement CookieYes
                document.addEventListener('cookieyes_consent_update', function(event) {
                  if (event.detail.accepted.includes('analytics') || event.detail.accepted.includes('performance')) {
                    initGTM();
                  }
                });
                
                // Vérifier si le consentement a déjà été donné
                if (typeof ckyAPI !== 'undefined' && ckyAPI.getConsentValue('analytics')) {
                  initGTM();
                }
              `,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
