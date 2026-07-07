import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import AdminLayoutClient from './AdminLayoutClient'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={geistMono.variable}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  )
}
