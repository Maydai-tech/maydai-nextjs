'use client'

import Link from 'next/link'
import { ArrowRight, MessageSquare } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'

export function ChatLandingContent() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-2 py-8 sm:px-4">
      <Card className="w-full max-w-xl shadow-lg">
        <CardContent className="px-6 py-10 text-center sm:px-10 sm:py-14">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0080A3]/10">
            <MessageSquare className="h-7 w-7 text-[#0080A3]" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Discutez avec votre Assistant IA
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600 sm:text-base">
            Cadrez votre projet et lancez une évaluation de conformité au règlement
            européen sur l’IA en conversation, étape par étape — sans formulaire
            interminable.
          </p>
          <Link
            href="/usecases/new/setup-chat"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0080A3] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#006280] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2 sm:w-auto"
          >
            Créer un cas d&apos;usage
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ChatLandingPage() {
  return (
    <ProtectedRoute>
      <ChatLandingContent />
    </ProtectedRoute>
  )
}
