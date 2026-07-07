import type { Metadata } from 'next'
import UseCasesLayoutClient from './UseCasesLayoutClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <UseCasesLayoutClient>{children}</UseCasesLayoutClient>
}
