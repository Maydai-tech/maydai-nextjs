import RootProviders from '@/components/RootProviders'
import GTMConsentHeadScripts from '@/components/GTMConsentHeadScripts'
import { getNonce } from '@/lib/csp-nonce'
import { shouldLoadOfficialGTM } from '@/lib/should-load-official-gtm'

export default async function SaasLayout({
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
      <RootProviders loadOfficialGTM={loadOfficialGTM} nonce={nonce}>
        {children}
      </RootProviders>
    </>
  )
}
