import Script from 'next/script'

interface GTMConsentHeadScriptsProps {
  loadOfficialGTM: boolean
  nonce?: string
}

/** Scripts consent mode + CookieYes — partagés entre layouts marketing et SaaS. */
export default function GTMConsentHeadScripts({
  loadOfficialGTM,
  nonce,
}: GTMConsentHeadScriptsProps) {
  if (!loadOfficialGTM) return null

  return (
    <>
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
      {process.env.NEXT_PUBLIC_COOKIEYES_ID && (
        <Script
          id="cookieyes"
          src={`https://cdn-cookieyes.com/client_data/${process.env.NEXT_PUBLIC_COOKIEYES_ID}/script.js`}
          strategy="lazyOnload"
          nonce={nonce}
        />
      )}
    </>
  )
}
