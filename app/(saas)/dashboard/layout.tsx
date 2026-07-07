import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={geistMono.variable}>{children}</div>
}
