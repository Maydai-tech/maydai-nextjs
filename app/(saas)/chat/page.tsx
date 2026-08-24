import type { Metadata } from 'next'
import ChatLandingPage from './ChatLandingPage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Chat IA',
}

export default function ChatPage() {
  return <ChatLandingPage />
}
