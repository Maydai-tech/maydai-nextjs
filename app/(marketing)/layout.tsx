import Header from '@/components/site-vitrine/Header'
import Footer from '@/components/site-vitrine/Footer'
import MarketingProviders from '@/components/MarketingProviders'
import GTMConsentHeadScripts from '@/components/GTMConsentHeadScripts'
import { getNonce } from '@/lib/csp-nonce'
import { shouldLoadOfficialGTM } from '@/lib/should-load-official-gtm'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loadOfficialGTM, nonce] = await Promise.all([
    shouldLoadOfficialGTM(),
    getNonce(),
  ])

  return (
    <>
      {nonce && <meta name="csp-nonce" content={nonce} />}
      <GTMConsentHeadScripts loadOfficialGTM={loadOfficialGTM} nonce={nonce} />
      <MarketingProviders loadOfficialGTM={loadOfficialGTM} nonce={nonce}>
      <Header />
      {children}
      <Footer />
    </MarketingProviders>
    </>
  )
}
