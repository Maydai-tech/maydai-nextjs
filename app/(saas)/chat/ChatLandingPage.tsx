'use client'

import Link from 'next/link'
import { BookOpen, Bot, LifeBuoy } from 'lucide-react'
import ProtectedRoute from '@/components/ProtectedRoute'
import HubTrustFooter from '@/components/ui/HubTrustFooter'

const ACTIVE_CARD_CLASS =
  'group flex h-full min-h-[220px] w-full flex-col rounded-xl border-2 border-transparent bg-white p-6 text-left ring-1 ring-gray-200 transition-all duration-200 hover:border-[#0080A3] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'

const UPCOMING_CARD_CLASS =
  'flex h-full min-h-[220px] w-full flex-col rounded-xl border-2 border-transparent bg-slate-50 p-6 text-left ring-1 ring-gray-200'

export function ChatLandingContent() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-gray-50 px-4 py-8 sm:items-center sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl">
        <header className="mb-10 flex flex-col items-center text-center">
          <h1 className="mb-3 font-sans text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Chat IA
          </h1>
          <p className="font-sans text-base text-slate-500">
            Choisissez l&apos;assistant avec lequel vous voulez échanger.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <Link
            href="/usecases/new/setup-chat"
            aria-labelledby="chat-card-usecase-title"
            aria-describedby="chat-card-usecase-desc"
            className={ACTIVE_CARD_CLASS}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0080A3]/10 transition group-hover:bg-[#0080A3]/15">
              <Bot className="h-7 w-7 text-[#0080A3]" aria-hidden />
            </div>
            <h2
              id="chat-card-usecase-title"
              className="mt-4 font-sans text-lg font-bold text-gray-900"
            >
              Créer un cas d&apos;usage
            </h2>
            <p
              id="chat-card-usecase-desc"
              className="mt-3 font-sans text-sm leading-relaxed text-gray-600"
            >
              Cadrez votre projet et lancez une évaluation de conformité AI Act, étape par
              étape — sans formulaire interminable.
            </p>
          </Link>

          <div
            aria-disabled="true"
            aria-labelledby="chat-card-pedagogy-title"
            aria-describedby="chat-card-pedagogy-desc"
            className={`${UPCOMING_CARD_CLASS} cursor-not-allowed`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80">
              <BookOpen className="h-7 w-7 text-slate-500" aria-hidden />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2
                id="chat-card-pedagogy-title"
                className="font-sans text-lg font-bold text-slate-700"
              >
                Pédagogie AI Act
              </h2>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Bientôt disponible
              </span>
            </div>
            <p
              id="chat-card-pedagogy-desc"
              className="mt-3 font-sans text-sm leading-relaxed text-slate-500"
            >
              Posez vos questions sur le règlement européen sur l&apos;IA, sans lancer
              d&apos;évaluation.
            </p>
          </div>

          <div
            aria-disabled="true"
            aria-labelledby="chat-card-support-title"
            aria-describedby="chat-card-support-desc"
            className={`${UPCOMING_CARD_CLASS} cursor-not-allowed`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/80">
              <LifeBuoy className="h-7 w-7 text-slate-500" aria-hidden />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2
                id="chat-card-support-title"
                className="font-sans text-lg font-bold text-slate-700"
              >
                Support plateforme MaydAI
              </h2>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                Bientôt disponible
              </span>
            </div>
            <p
              id="chat-card-support-desc"
              className="mt-3 font-sans text-sm leading-relaxed text-slate-500"
            >
              Obtenez de l&apos;aide pour utiliser MaydAI au quotidien.
            </p>
          </div>
        </div>

        <HubTrustFooter />
      </div>
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
