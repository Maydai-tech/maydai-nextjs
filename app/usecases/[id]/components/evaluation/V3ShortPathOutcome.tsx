'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useCaseRoutes, withEvaluationEntree } from '../../utils/routes'
import { loadQuestions } from '../../utils/questions-loader'
import { getV3ShortPathOutcomeSignals } from '../../utils/v3-short-path-outcome-signals'
import { DECLARATION_PROOF_FLOW_COPY } from '../../utils/declaration-proof-flow-copy'
import {
  buildV3ShortPathMailtoHref,
  buildV3ShortPathShareableMarkdown,
  buildV3ShortPathShareablePlainText,
  getV3ShortPathImmediateImplicationLines,
  v3ShortPathExportBasename,
  v3ShortPathQualificationShortLabel,
  v3ShortPathRiskDisplayLabel,
  V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS,
  V3_SHORT_PATH_REMAINING_ITEMS,
} from '../../utils/v3-short-path-outcome-summary'
import {
  trackV3ShortPathCta,
  trackV3ShortPathOutcomeResult,
  trackV3ShortPathOutcomeView,
  v3ShortPathSystemTypeBucket,
  type V3ShortPathCtaId,
} from '@/lib/v3-short-path-analytics'
import {
  getV3ShortPathFunnelCopy,
  resolveV3ShortPathFunnelOutcomeKey,
} from '../../utils/v3-short-path-funnel-context'
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileDown,
  FolderOpen,
  ListChecks,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react'

type RiskPayload = {
  risk_level?: string
  classification_status?: string
  error?: string
}

export function V3ShortPathOutcome({
  useCaseId,
  companyId,
  accessToken,
  answers,
  useCaseName,
  systemType,
  evaluationRunId,
}: {
  useCaseId: string
  companyId: string
  accessToken: string | undefined
  answers?: Record<string, unknown>
  /** Nom du cas — inclus dans le texte « copier le résumé ». */
  useCaseName?: string | null
  /** Même champ que `usecases.system_type` — agrégé en bucket analytics. */
  systemType?: string | null
  /** Run first-party (Supabase) — complétion parcours court après résultat API. */
  evaluationRunId?: string | null
}) {
  const [data, setData] = useState<RiskPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const outcomeViewTracked = useRef(false)
  const outcomeResultTracked = useRef(false)
  const evaluationRunCompletedSent = useRef(false)

  const transparencySignals = useMemo(() => {
    const qs = loadQuestions()
    return getV3ShortPathOutcomeSignals(answers, qs)
  }, [answers])

  const systemBucket = useMemo(() => v3ShortPathSystemTypeBucket(systemType), [systemType])

  useEffect(() => {
    if (outcomeViewTracked.current) return
    outcomeViewTracked.current = true
    trackV3ShortPathOutcomeView({ usecase_id: useCaseId })
  }, [useCaseId])

  useEffect(() => {
    if (loading || outcomeResultTracked.current) return
    if (!data || data.error || !data.classification_status) return
    outcomeResultTracked.current = true
    trackV3ShortPathOutcomeResult({
      usecase_id: useCaseId,
      system_type_bucket: systemBucket,
      classification_status: data.classification_status,
      risk_level: data.risk_level,
    })
  }, [loading, data, useCaseId, systemBucket])

  useEffect(() => {
    if (loading || !evaluationRunId || !accessToken) return
    if (evaluationRunCompletedSent.current) return
    evaluationRunCompletedSent.current = true
    const payload: Record<string, string | null> = {}
    if (data && !data.error && data.classification_status) {
      payload.classification_status = data.classification_status
      payload.risk_level = data.risk_level ?? null
    }
    void fetch(`/api/usecases/${useCaseId}/evaluation-runs/${evaluationRunId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* best-effort */
    })
  }, [loading, evaluationRunId, accessToken, useCaseId, data])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!accessToken) {
        setData({ error: 'Session non disponible' })
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/use-cases/${useCaseId}/risk-level`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const json = (await res.json()) as RiskPayload
        if (!cancelled) setData(res.ok ? json : { error: json.error || 'Erreur API' })
      } catch {
        if (!cancelled) setData({ error: 'Erreur réseau' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [useCaseId, accessToken])

  const longHrefBase = useCaseRoutes.evaluation(useCaseId)
  const longHref = withEvaluationEntree(longHrefBase, 'short_path_outcome_long')
  const longHrefErrorFallback = withEvaluationEntree(longHrefBase, 'outcome_error_fallback_long')
  const overviewHref = useCaseRoutes.overview(useCaseId)
  const dossierHref = `/dashboard/${companyId}/dossiers/${useCaseId}`
  const todoHref = `/dashboard/${companyId}/todo-list?usecase=${useCaseId}`
  const dashboardHref = useCaseRoutes.dashboard(companyId)

  const isImpossible = data?.classification_status === 'impossible'
  const isQualified = data?.classification_status === 'qualified'

  const funnelKey = useMemo(
    () =>
      data && !data.error && data.classification_status
        ? resolveV3ShortPathFunnelOutcomeKey(data.classification_status, data.risk_level)
        : null,
    [data]
  )

  const funnelCopy = useMemo(
    () => (funnelKey ? getV3ShortPathFunnelCopy(funnelKey) : null),
    [funnelKey]
  )

  const implicationLines = useMemo(
    () => getV3ShortPathImmediateImplicationLines(data?.risk_level, data?.classification_status),
    [data?.risk_level, data?.classification_status]
  )

  const exportLinks = useMemo(
    () => [
      {
        label:
          funnelCopy?.primaryCtaLabel ?? DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroCtaLabel,
        path: longHrefBase,
      },
      { label: 'Synthèse du cas', path: overviewHref },
      { label: DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase, path: dossierHref },
      { label: DECLARATION_PROOF_FLOW_COPY.linkLabelTodo, path: todoHref },
      { label: 'Tableau de bord entreprise', path: dashboardHref },
    ],
    [funnelCopy?.primaryCtaLabel, longHrefBase, overviewHref, dossierHref, todoHref, dashboardHref]
  )

  const shareableText = useMemo(() => {
    if (loading || data?.error) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    return buildV3ShortPathShareablePlainText({
      useCaseName,
      riskLevel: data?.risk_level,
      classificationStatus: data?.classification_status,
      signals: transparencySignals,
      origin,
      links: exportLinks,
    })
  }, [
    loading,
    data?.error,
    data?.risk_level,
    data?.classification_status,
    useCaseName,
    transparencySignals,
    exportLinks,
  ])

  const markdownExport = useMemo(() => {
    if (loading || data?.error) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined
    return buildV3ShortPathShareableMarkdown({
      useCaseName,
      riskLevel: data?.risk_level,
      classificationStatus: data?.classification_status,
      signals: transparencySignals,
      origin,
      links: exportLinks,
    })
  }, [
    loading,
    data?.error,
    data?.risk_level,
    data?.classification_status,
    useCaseName,
    transparencySignals,
    exportLinks,
  ])

  const exportBasename = useMemo(
    () => v3ShortPathExportBasename({ useCaseName, useCaseId }),
    [useCaseName, useCaseId]
  )

  const overviewAbsoluteUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}${overviewHref}`
  }, [overviewHref])

  const mailtoHref = useMemo(() => {
    if (!shareableText) return ''
    return buildV3ShortPathMailtoHref({
      useCaseName,
      overviewUrl: overviewAbsoluteUrl || undefined,
    })
  }, [shareableText, useCaseName, overviewAbsoluteUrl])

  const trackCta = useCallback(
    (cta: V3ShortPathCtaId, cta_placement?: string) => {
      trackV3ShortPathCta({
        usecase_id: useCaseId,
        system_type_bucket: systemBucket,
        cta,
        ...(cta_placement && { cta_placement }),
        ...(data?.classification_status != null && { classification_status: data.classification_status }),
        ...(data?.risk_level !== undefined && { risk_level: data.risk_level }),
        ...(funnelKey && { outcome_funnel_key: funnelKey }),
      })
    },
    [useCaseId, systemBucket, data?.classification_status, data?.risk_level, funnelKey]
  )

  const triggerBrowserDownload = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [])

  const handleDownloadTxt = useCallback(() => {
    if (!shareableText) return
    trackCta('download_txt')
    triggerBrowserDownload(shareableText, `${exportBasename}.txt`, 'text/plain')
  }, [shareableText, exportBasename, triggerBrowserDownload, trackCta])

  const handleDownloadMd = useCallback(() => {
    if (!markdownExport) return
    trackCta('download_md')
    triggerBrowserDownload(markdownExport, `${exportBasename}.md`, 'text/markdown')
  }, [markdownExport, exportBasename, triggerBrowserDownload, trackCta])

  const handleDownloadPrediagnosticPdf = useCallback(async () => {
    if (!accessToken) return
    trackCta('download_pdf_prediagnostic')
    setPdfLoading(true)
    setPdfError(null)
    try {
      const res = await fetch(`/api/usecases/${useCaseId}/prediagnostic-pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        let msg = `Erreur ${res.status}`
        try {
          const j = (await res.json()) as { error?: string }
          if (j?.error) msg = j.error
        } catch {
          /* ignore */
        }
        setPdfError(msg)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition')
      let fname = 'maydai-prediagnostic-court.pdf'
      const m = cd?.match(/filename="([^"]+)"/)
      if (m?.[1]) fname = m[1]
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setPdfError('Téléchargement impossible. Réessayez ou utilisez .txt / .md.')
    } finally {
      setPdfLoading(false)
    }
  }, [accessToken, useCaseId, trackCta])

  const handleCopySummary = useCallback(async () => {
    if (!shareableText) return
    try {
      await navigator.clipboard.writeText(shareableText)
      trackCta('copy_summary')
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2500)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 3500)
    }
  }, [shareableText, trackCta])

  return (
    <article
      id="v3-short-path-prediagnostic"
      className="rounded-2xl border border-[#0080A3]/25 bg-white shadow-md p-6 sm:p-8 max-w-3xl mx-auto"
      aria-labelledby="v3-short-path-title"
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal-900">
          Étape 6 · Résultat
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#0080A3]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Pré-diagnostic rapide
        </span>
      </div>

      <h2
        id="v3-short-path-title"
        className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
      >
        Pré-diagnostic AI Act (parcours court)
      </h2>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Synthèse produite par le <strong className="text-gray-900">même moteur de qualification</strong> que le
        parcours complet, sur la partie du questionnaire déjà parcourue. Utile en interne pour prioriser et cadrer la
        discussion — sans remplacer l’audit maturité, les preuves du dossier ni le plan d’action détaillé.
      </p>
      <p className="text-xs text-gray-700 leading-relaxed mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="font-semibold text-gray-900">{DECLARATION_PROOF_FLOW_COPY.filRougeTitle}</span>
        {' — '}
        {DECLARATION_PROOF_FLOW_COPY.filRougeBody}
      </p>
      <p className="text-xs text-gray-600 leading-relaxed mb-8">{DECLARATION_PROOF_FLOW_COPY.ouiSansPreuve}</p>

      {!loading && !data?.error && funnelCopy ? (
        <p className="text-sm text-gray-800 leading-relaxed mb-6 rounded-lg border border-[#0080A3]/20 bg-[#0080A3]/[0.06] px-4 py-3">
          {funnelCopy.contextualLead}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 py-10 justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0080A3]" />
          <span>Chargement du niveau IA Act…</span>
        </div>
      ) : data?.error ? (
        <div className="space-y-4 mb-6">
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm p-4">{data.error}</div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Vous pouvez tout de même reprendre l’évaluation ou retrouver le cas depuis la synthèse.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Link
              href={longHrefErrorFallback}
              onClick={() => trackCta('evaluation_long', 'outcome_error_fallback')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0080A3] text-white font-medium text-sm hover:bg-[#006280]"
            >
              Parcours complet
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href={overviewHref}
              onClick={() => trackCta('overview', 'outcome_error_fallback')}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 text-gray-800 font-medium text-sm hover:bg-gray-50"
            >
              Synthèse du cas
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section
            className="mb-8 space-y-4"
            aria-label="Résultat de qualification"
            data-v3-short-path-section="result"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-[#0080A3]/20 bg-[#0080A3]/[0.06] p-4">
                <p className="text-xs font-semibold text-[#006280] uppercase mb-1">Niveau AI Act indiqué</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {v3ShortPathRiskDisplayLabel(data?.risk_level, data?.classification_status)}
                </p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Indication réglementaire issue des réponses enregistrées sur ce périmètre. Ce n’est ni un score de
                  maturité ni une preuve documentaire.
                </p>
              </div>
              <div
                className={`rounded-xl border p-4 ${
                  isImpossible
                    ? 'border-amber-300 bg-amber-50/90'
                    : isQualified
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Statut de qualification</p>
                <p className="text-lg font-bold text-gray-900 leading-snug">
                  {v3ShortPathQualificationShortLabel(data?.classification_status)}
                </p>
                {isImpossible && (
                  <p className="text-sm text-amber-950/90 mt-2 leading-relaxed">
                    Le moteur ne peut pas attribuer un palier fiable sans levée d’ambiguïté (réponses « je ne sais pas »
                    ou branches à compléter).
                  </p>
                )}
                {isQualified && (
                  <p className="text-sm text-emerald-950/90 mt-2 leading-relaxed">
                    Sur les questions parcourues, la conclusion est cohérente avec celle du parcours long pour le même
                    jeu de réponses couvert.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Ce que cela implique, concrètement (aujourd’hui)
              </p>
              <ul className="space-y-2 text-sm text-gray-800 leading-relaxed">
                {implicationLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#0080A3] font-bold shrink-0">·</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 mb-8"
            aria-label="Ce que le pré-diagnostic a établi"
            data-v3-short-path-section="established"
          >
            <p className="text-xs font-semibold uppercase text-gray-700 mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-[#0080A3]" aria-hidden />
              Ce pré-diagnostic a permis d’établir
            </p>
            <ul className="space-y-2 text-sm text-gray-800">
              {V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[#0080A3] font-bold shrink-0">·</span>
                  <span>{b}</span>
                </li>
              ))}
              {transparencySignals.length > 0 ? (
                transparencySignals.map((s) => (
                  <li key={s.title} className="flex gap-2">
                    <span className="text-[#0080A3] font-bold shrink-0">·</span>
                    <span>
                      <strong className="text-gray-900">{s.title}</strong>
                      <span className="text-gray-600"> — {s.detail}</span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="flex gap-2 text-gray-600">
                  <span className="text-[#0080A3] font-bold shrink-0">·</span>
                  <span>
                    Aucune question sensibilisation (Q12) ni transparence E6 sur votre branche — le graphe métier est
                    inchangé, seul le périmètre affiché diffère.
                  </span>
                </li>
              )}
            </ul>
          </section>

          <section
            className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 sm:p-5 mb-8"
            aria-label="Ce qu’il reste à compléter"
            data-v3-short-path-section="remaining"
          >
            <p className="text-xs font-semibold uppercase text-amber-950/90 mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-amber-800" aria-hidden />
              Ce qu’il reste à compléter (hors parcours court)
            </p>
            <ul className="space-y-3">
              {V3_SHORT_PATH_REMAINING_ITEMS.map((item) => (
                <li key={item.title} className="text-sm text-gray-900">
                  <span className="font-semibold text-gray-900">{item.title}</span>
                  <span className="text-gray-700"> — {item.detail}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 mb-6"
            aria-label="Pourquoi poursuivre avec le parcours complet"
            data-v3-short-path-section="why-long"
          >
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              {funnelCopy?.whyLongTitle ?? 'Pourquoi enchaîner avec le parcours complet'}
            </p>
            <ul className="space-y-2 text-sm text-gray-800 leading-relaxed">
              {(funnelCopy?.whyLongBullets ?? []).map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[#0080A3] font-bold shrink-0">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl border-2 border-[#0080A3] bg-gradient-to-br from-[#0080A3]/10 via-white to-teal-50/40 p-5 sm:p-6 mb-8 shadow-sm"
            aria-label="Continuer vers le parcours complet"
            data-v3-short-path-section="next-step-long"
          >
            <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#0080A3] shrink-0" aria-hidden />
              {funnelCopy?.heroTitle ?? DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroTitle}
            </p>
            <p className="text-sm text-gray-800 leading-relaxed mb-4">
              {funnelCopy?.heroLead ?? DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroLead}
            </p>
            <ul className="space-y-2 text-sm text-gray-800 leading-relaxed mb-5">
              {(funnelCopy?.heroBullets ?? [
                DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroBulletMaturity,
                DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroBulletProof,
                DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroBulletPlan,
              ]).map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-[#0080A3] font-bold shrink-0">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">{DECLARATION_PROOF_FLOW_COPY.rapportPlanHint}</p>
            <Link
              href={longHref}
              onClick={() => trackCta('evaluation_long', 'outcome_hero')}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#0080A3] text-white font-semibold text-sm hover:bg-[#006280] transition-colors shadow-md"
            >
              {funnelCopy?.primaryCtaLabel ?? DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeHeroCtaLabel}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </section>

          {shareableText ? (
            <div
              className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5 mb-8"
              data-v3-short-path-section="share"
            >
              <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide mb-2">
                Exporter ou partager (interne)
              </p>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                <strong className="text-gray-800">Même contenu</strong> que l’affichage ci-dessus : texte brut (
                <code className="text-[11px] bg-white px-1 rounded border">.txt</code>), Markdown (
                <code className="text-[11px] bg-white px-1 rounded border">.md</code>
                ) pour notes / wiki, ou copie presse-papiers. Les liens utilisent l’URL du navigateur. Le lien e-mail
                ouvre votre messagerie avec un court message ; joignez le fichier téléchargé ou collez le résumé.
              </p>
              <p className="text-xs text-amber-900/90 leading-relaxed mb-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
                <strong className="text-gray-900">PDF léger (pré-diagnostic court)</strong> — une page générée côté
                serveur, distincte du <strong className="text-gray-900">rapport d’audit PDF complet</strong> (parcours
                long, cas complété, plan détaillé et score de maturité).
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#0080A3] text-[#006280] font-semibold text-sm hover:bg-[#0080A3]/10 transition-colors sm:min-w-[11rem]"
                >
                  {copyState === 'copied' ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" aria-hidden />
                      Copier le résumé
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50 sm:min-w-[11rem]"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Télécharger .txt
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMd}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50 sm:min-w-[11rem]"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Télécharger .md
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPrediagnosticPdf}
                  disabled={pdfLoading || !accessToken}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-[#0080A3]/40 bg-white text-[#006280] font-semibold text-sm hover:bg-[#0080A3]/5 disabled:opacity-50 sm:min-w-[11rem]"
                >
                  {pdfLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                  Télécharger le pré-diagnostic (PDF)
                </button>
                {mailtoHref ? (
                  <a
                    href={mailtoHref}
                    rel="nofollow noreferrer"
                    onClick={() => trackCta('mailto_prepare')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium text-sm hover:bg-gray-50 sm:min-w-[11rem]"
                  >
                    <Mail className="h-4 w-4 shrink-0" aria-hidden />
                    Préparer un e-mail
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          {copyState === 'error' ? (
            <p className="text-xs text-red-600 mb-4 -mt-4" role="status">
              Copie impossible (navigateur ou permissions). Vous pouvez sélectionner le texte manuellement plus tard.
            </p>
          ) : null}
          {pdfError ? (
            <p className="text-xs text-red-600 mb-4" role="status">
              {pdfError}
            </p>
          ) : null}

          <section aria-label="Accès rapides" className="border-t border-gray-200 pt-6 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Accès rapides</p>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{DECLARATION_PROOF_FLOW_COPY.shortPathOutcomeQuickLinksHint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {(funnelCopy?.quickLinkPriority ?? ['dossier', 'todo', 'overview', 'dashboard']).map((qk) => {
                const linkClass =
                  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-800 font-medium text-sm hover:bg-gray-50'
                if (qk === 'dossier') {
                  return (
                    <Link
                      key="dossier"
                      href={dossierHref}
                      onClick={() => trackCta('dossier', 'outcome_quick_links')}
                      className={linkClass}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" aria-hidden />
                      {DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase}
                    </Link>
                  )
                }
                if (qk === 'todo') {
                  return (
                    <Link
                      key="todo"
                      href={todoHref}
                      onClick={() => trackCta('todo', 'outcome_quick_links')}
                      className={linkClass}
                    >
                      <ListChecks className="h-4 w-4 shrink-0" aria-hidden />
                      {DECLARATION_PROOF_FLOW_COPY.linkLabelTodo}
                    </Link>
                  )
                }
                if (qk === 'overview') {
                  return (
                    <Link
                      key="overview"
                      href={overviewHref}
                      onClick={() => trackCta('overview', 'outcome_quick_links')}
                      className={linkClass}
                    >
                      <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                      Synthèse du cas
                    </Link>
                  )
                }
                return (
                  <Link
                    key="dashboard"
                    href={dashboardHref}
                    onClick={() => trackCta('dashboard', 'outcome_quick_links')}
                    className={linkClass}
                  >
                    Tableau de bord entreprise
                  </Link>
                )
              })}
            </div>
          </section>
        </>
      )}
    </article>
  )
}
