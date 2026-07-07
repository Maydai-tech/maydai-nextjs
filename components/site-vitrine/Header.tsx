import { MARKETING_HEADER_CTAS } from '@/config/marketing-navigation'
import { isMarketingUserAuthenticated } from '@/lib/marketing-session'
import HeaderClient from '@/components/site-vitrine/HeaderClient'

export default async function Header() {
  const isAuthenticated = await isMarketingUserAuthenticated()
  const headerCtas = isAuthenticated
    ? MARKETING_HEADER_CTAS.authenticated
    : MARKETING_HEADER_CTAS.unauthenticated

  return <HeaderClient headerCtas={headerCtas} />
}
