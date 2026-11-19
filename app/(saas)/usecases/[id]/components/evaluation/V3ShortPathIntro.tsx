'use client'

import Link from 'next/link'
import { useCaseRoutes } from '../../utils/routes'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'
import { trackV3ShortPathCta, v3ShortPathSystemTypeBucket } from '@/lib/v3-short-path-analytics'
import { Sparkles, Shield, ArrowRight } from 'lucide-react'

type Props = {
  useCaseId: string
  /** Lien vers le parcours long (même entrée évaluation sans ?parcours=court). */
  longEvaluationHref: string
  /** Agrégation analytics (même champ que `usecases.system_type`). */
  systemType?: string | null
}

/**
 * Promesse produit du parcours court V3 — affiché en tête du questionnaire court.
 */
export function V3ShortPathIntro({ useCaseId, longEvaluationHref, systemType }: Props) {
  const bucket = v3ShortPathSystemTypeBucket(systemType)

  return (
    <div className="mb-8 rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/95 via-white to-sky-50/40 px-4 py-5 sm:px-6 sm:py-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-800 mb-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Pré-diagnostic rapide AI Act
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-2">
            Parcours court MaydAI
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            En quelques minutes, vous obtenez une <strong className="text-gray-900">première lecture réglementaire</strong>{' '}
            (qualification et niveau AI Act) avec le <strong className="text-gray-900">même moteur</strong> que le
            parcours complet. Ce n’est <strong className="text-gray-900">pas un audit</strong>, pas une collecte de
            preuves, et pas le plan d’action détaillé : c’est un <strong className="text-gray-900">point d’entrée clair</strong>{' '}
            pour prioriser votre cas.
          </p>
          <ul className="text-sm text-gray-700 space-y-1.5 list-none pl-0">
            <li className="flex gap-2">
              <Shield className="h-4 w-4 text-[#0080A3] shrink-0 mt-0.5" aria-hidden />
              <span>
                <strong className="text-gray-900">Ce que vous aurez :</strong> niveau AI Act, statut de qualification,
                sensibilisation (Q12) et transparence minimale (E6) si votre chemin le prévoit — sans le bloc maturité{' '}
                <strong className="text-gray-900">E5</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <Shield className="h-4 w-4 text-[#0080A3] shrink-0 mt-0.5" aria-hidden />
              <span>
                <strong className="text-gray-900">Ce que vous n’aurez pas encore :</strong> preuves documentaires,
                score de maturité détaillé, rapport complet et todo conformité structurée — réservés au{' '}
                <strong className="text-gray-900">parcours complet</strong>.
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-gray-600 leading-relaxed border-t border-teal-100/80 pt-3">
            <span className="font-semibold text-gray-800">{DECLARATION_PROOF_FLOW_COPY.filRougeTitle}</span>
            {' — '}
            {DECLARATION_PROOF_FLOW_COPY.filRougeBody}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 pt-4 border-t border-teal-100/80">
        <Link
          href={longEvaluationHref}
          onClick={() =>
            trackV3ShortPathCta({
              usecase_id: useCaseId,
              system_type_bucket: bucket,
              cta: 'evaluation_long',
              cta_placement: 'intro_primary',
            })
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0080A3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#006280] transition-colors order-1"
        >
          {DECLARATION_PROOF_FLOW_COPY.shortPathIntroLongPrimaryCta}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
        <Link
          href={useCaseRoutes.overview(useCaseId)}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors order-3 sm:order-2"
        >
          {DECLARATION_PROOF_FLOW_COPY.shortPathIntroBackToSynthesis}
        </Link>
      </div>
      <p className="mt-3 text-xs text-gray-600 leading-relaxed">
        {DECLARATION_PROOF_FLOW_COPY.shortPathIntroLongPrimaryHint}
      </p>
    </div>
  )
}
