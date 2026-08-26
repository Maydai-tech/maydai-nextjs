'use client'

import Link from 'next/link'
import { ArrowLeft, Bot, ClipboardList, Clock } from 'lucide-react'
import HubTrustFooter from '@/components/ui/HubTrustFooter'

export type CreationInteractionPath = 'chat' | 'questionnaire'

interface CreateUseCaseHubProps {
  companyName?: string
  dashboardHref?: string
  onSelect: (path: CreationInteractionPath) => void
}

const CARD_BUTTON_CLASS =
  'group flex h-full min-h-[220px] w-full flex-col rounded-xl border-2 border-transparent bg-white p-6 text-left ring-1 ring-gray-200 transition-all duration-200 hover:border-[#0080A3] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'

export default function CreateUseCaseHub({
  companyName,
  dashboardHref,
  onSelect,
}: CreateUseCaseHubProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center bg-gray-50 px-4 py-8 sm:items-center sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        {dashboardHref ? (
          <Link
            href={dashboardHref}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-600 transition hover:text-[#0080A3]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Retour au dashboard
          </Link>
        ) : null}
        <header className="mb-10 flex flex-col items-center text-center">
          <h1 className="mb-3 font-sans text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Évaluez votre cas d&apos;usage
          </h1>
          <p className="mb-4 font-sans text-base text-slate-500">
            Choisissez votre mode d&apos;évaluation.
          </p>
          {companyName ? (
            <div
              className="inline-flex items-center rounded-full border border-slate-100 bg-slate-50 px-3 py-1 font-sans text-sm text-slate-400"
              aria-label={`Environnement de travail actuel. Registre : ${companyName}`}
            >
              <span className="mr-1 font-medium">Registre :</span> {companyName}
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <button
            type="button"
            onClick={() => onSelect('chat')}
            aria-labelledby="card1-title"
            aria-describedby="card1-desc"
            className={CARD_BUTTON_CLASS}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0080A3]/10 transition group-hover:bg-[#0080A3]/15">
              <Bot className="h-7 w-7 text-[#0080A3]" aria-hidden />
            </div>
            <h2 id="card1-title" className="mt-4 font-sans text-lg font-bold text-gray-900">
              Assistant Chat IA
            </h2>
            <div className="mt-2 mb-3 flex w-fit items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-sm font-medium text-[#0080A3]">
              <Clock size={16} aria-hidden />
              <span>Rapide : &lt; 2 min</span>
            </div>
            <p id="card1-desc" className="font-sans text-sm leading-relaxed text-gray-600">
              3 étapes : vérification du profil (entreprise, secteur…), brouillon du cas d’usage,
              puis évaluation AI Act. Idéal sur mobile.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelect('questionnaire')}
            aria-labelledby="card2-title"
            aria-describedby="card2-desc"
            className={CARD_BUTTON_CLASS}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0080A3]/10 transition group-hover:bg-[#0080A3]/15">
              <ClipboardList className="h-7 w-7 text-[#0080A3]" aria-hidden />
            </div>
            <h2 id="card2-title" className="mt-4 font-sans text-lg font-bold text-gray-900">
              Questionnaires détaillés
            </h2>
            <div className="mt-2 mb-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-sm font-medium text-[#0080A3]">
                <Clock size={16} aria-hidden />
                Court : ~3 min
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-600">
                <Clock size={16} aria-hidden />
                Long : ~6 min
              </span>
            </div>
            <p id="card2-desc" className="font-sans text-sm leading-relaxed text-gray-600">
              Parcours classique et pédagogique. Choisissez la version courte pour l&apos;essentiel,
              ou la version longue pour explorer l&apos;IA Act en détail.
            </p>
          </button>
        </div>

        <HubTrustFooter />
      </div>
    </div>
  )
}
