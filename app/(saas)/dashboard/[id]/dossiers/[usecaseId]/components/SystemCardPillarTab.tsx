'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, FileText, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import ComplianceFileUpload from '@/components/ComplianceFileUpload'
import UploadedFileDisplay from '@/components/UploadedFileDisplay'
import { formatScore } from '@/lib/utils'
import type { AiActComplianceItem, SystemCardPillar } from '@/lib/validations/system-card'

interface SystemCardPillarTabProps {
  usecaseId: string
  dossierId: string | null
  pillar: SystemCardPillar | null
  maydaiApplied: boolean
  userApplied: boolean
  halfPoints: number
  initialUserNotes?: string
  fileUrl?: string | null
  isUploading?: boolean
  isDeleting?: boolean
  acceptedFormats?: string
  onFileSelected?: (file: File) => void
  onFileDelete?: () => void
  onUpdateSuccess: (payload?: {
    scoreChange?: {
      previousScore: number | null
      newScore: number | null
      pointsGained: number
      reason: string
    }
  }) => void
}

export default function SystemCardPillarTab({
  usecaseId,
  dossierId,
  pillar,
  maydaiApplied,
  userApplied,
  halfPoints,
  initialUserNotes = '',
  fileUrl,
  isUploading = false,
  isDeleting = false,
  acceptedFormats = '.pdf,.docx,.md',
  onFileSelected,
  onFileDelete,
  onUpdateSuccess,
}: SystemCardPillarTabProps) {
  const { getAccessToken } = useAuth()
  const [loadingMaydai, setLoadingMaydai] = useState(false)
  const [loadingUser, setLoadingUser] = useState(false)
  const [userNotes, setUserNotes] = useState(initialUserNotes)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setUserNotes(initialUserNotes)
  }, [initialUserNotes])

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> Conforme
          </span>
        )
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden /> Partiel
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded">
            <XCircle className="w-3.5 h-3.5" aria-hidden /> Non conforme
          </span>
        )
    }
  }

  const postCompletion = async (body: Record<string, unknown>) => {
    const token = getAccessToken()
    if (!token) {
      setErrorMessage('Session expirée. Veuillez vous reconnecter.')
      return false
    }

    const res = await fetch('/api/dossiers/pillar-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        usecaseId,
        dossierId,
        pillarCode: pillar?.pillar_code,
        pillarId: pillar?.id,
        ...body,
      }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => null)
      setErrorMessage(payload?.error || 'Impossible de valider ce pilier.')
      return false
    }

    const payload = await res.json().catch(() => null)
    setErrorMessage(null)
    onUpdateSuccess(payload)
    return true
  }

  const handleValidateMaydai = async () => {
    if (!pillar) return
    setLoadingMaydai(true)
    try {
      await postCompletion({ applyMaydaiPrefill: true })
    } catch (e) {
      console.error(e)
      setErrorMessage('Impossible de valider l’analyse MaydAI.')
    } finally {
      setLoadingMaydai(false)
    }
  }

  const handleValidateUserCompletion = async () => {
    if (!pillar) return
    setLoadingUser(true)
    try {
      await postCompletion({
        applyUserCompletion: true,
        userNotes: userNotes.trim() || undefined,
      })
    } catch (e) {
      console.error(e)
      setErrorMessage('Impossible de valider les compléments entreprise.')
    } finally {
      setLoadingUser(false)
    }
  }

  const handleRemoveMaydai = async () => {
    if (!pillar) return
    setLoadingMaydai(true)
    try {
      await postCompletion({ applyMaydaiPrefill: false })
    } catch (e) {
      console.error(e)
      setErrorMessage('Impossible de retirer l’analyse MaydAI.')
    } finally {
      setLoadingMaydai(false)
    }
  }

  const handleRemoveUserCompletion = async () => {
    if (!pillar) return
    setLoadingUser(true)
    try {
      await postCompletion({ applyUserCompletion: false })
    } catch (e) {
      console.error(e)
      setErrorMessage('Impossible de retirer les compléments entreprise.')
    } finally {
      setLoadingUser(false)
    }
  }

  const recommendations = pillar?.recommendations
  const hasRecommendations = Boolean(
    recommendations?.fournisseur || recommendations?.integrateur || recommendations?.deployeur
  )

  return (
    <div className="flex flex-col gap-6">
      {errorMessage && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMessage}
        </p>
      )}

      <div className="border border-gray-200 rounded-xl bg-white p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-[#0080A3] shrink-0" aria-hidden />
            <h4 className="font-bold text-gray-900 text-base">Analyse MaydAI (pré-chargée)</h4>
          </div>
          {maydaiApplied && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-300">
                +50 % validé (+{formatScore(halfPoints)} pt{halfPoints >= 2 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={handleRemoveMaydai}
                disabled={loadingMaydai}
                className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                title="Retirer l'analyse MaydAI et recalculer le score"
              >
                {loadingMaydai ? '...' : 'Retirer'}
              </button>
            </div>
          )}
        </div>

        {pillar ? (
          <>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">
                Sections analysées : {pillar.sections_covered}
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200 leading-relaxed">
                {pillar.summary}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Évaluation AI Act
              </h5>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-xs">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="p-2.5">Exigence</th>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5">Application modèle</th>
                      <th className="p-2.5">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pillar.ai_act_compliance.map((item: AiActComplianceItem, idx: number) => (
                      <tr key={`${item.article}-${idx}`}>
                        <td className="p-2.5 font-medium">{item.exigence}</td>
                        <td className="p-2.5 text-gray-500 whitespace-nowrap">{item.article}</td>
                        <td className="p-2.5 text-gray-600">{item.application}</td>
                        <td className="p-2.5">{renderStatusBadge(item.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {hasRecommendations && (
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Recommandations
                </h5>
                <div className="space-y-2 text-sm text-gray-700">
                  {recommendations?.fournisseur && (
                    <p>
                      <span className="font-semibold">Fournisseur : </span>
                      {recommendations.fournisseur}
                    </p>
                  )}
                  {recommendations?.integrateur && (
                    <p>
                      <span className="font-semibold">Intégrateur : </span>
                      {recommendations.integrateur}
                    </p>
                  )}
                  {recommendations?.deployeur && (
                    <p>
                      <span className="font-semibold">Déployeur : </span>
                      {recommendations.deployeur}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!maydaiApplied && (
              <button
                type="button"
                onClick={handleValidateMaydai}
                disabled={loadingMaydai}
                className="w-full py-2.5 bg-[#0080A3] text-white font-medium text-sm rounded-lg hover:bg-[#006280] transition disabled:opacity-50"
              >
                {loadingMaydai
                  ? 'Calcul en cours...'
                  : "Valider l'analyse MaydAI pour ce cas d'usage (+50 % des points)"}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Aucune System Card disponible pour ce modèle.</p>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl bg-white p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-gray-700 shrink-0" aria-hidden />
            <h4 className="font-bold text-gray-900 text-base">Compléments & preuves entreprise</h4>
          </div>
          {userApplied && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-300">
                +50 % validé (+{formatScore(halfPoints)} pt{halfPoints >= 2 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={handleRemoveUserCompletion}
                disabled={loadingUser}
                className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                title="Retirer les compléments et recalculer le score"
              >
                {loadingUser ? '...' : 'Retirer'}
              </button>
            </div>
          )}
        </div>

        <div>
          <label
            className="block text-sm font-semibold text-gray-900 mb-2"
            htmlFor={`system-card-notes-${pillar?.id ?? 'empty'}`}
          >
            Justification contextuelle / Mesures internes
          </label>
          <textarea
            id={`system-card-notes-${pillar?.id ?? 'empty'}`}
            rows={4}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Saisissez ici les garde-fous applicatifs internes ou compléments spécifiques..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#0080A3] focus:outline-none"
          />
        </div>

        <div>
          <p className="block text-sm font-semibold text-gray-900 mb-2">
            Pièces justificatives & documents annexes
          </p>
          {fileUrl && onFileDelete ? (
            <UploadedFileDisplay
              fileUrl={fileUrl}
              onDelete={onFileDelete}
              isDeleting={isDeleting}
            />
          ) : onFileSelected ? (
            <>
              <ComplianceFileUpload
                label="Importer un document"
                helpText={`Formats acceptés : ${acceptedFormats} (max 10MB)`}
                acceptedFormats={acceptedFormats}
                onFileSelected={onFileSelected}
              />
              {isUploading && <p className="text-sm text-gray-600">Upload en cours...</p>}
            </>
          ) : (
            <p className="text-sm text-gray-500">Téléversement indisponible pour cette section.</p>
          )}
        </div>

        {!userApplied && (
          <button
            type="button"
            onClick={handleValidateUserCompletion}
            disabled={loadingUser || !pillar}
            className="w-full py-2.5 bg-[#0080A3] text-white font-medium text-sm rounded-lg hover:bg-[#006280] transition disabled:opacity-50"
          >
            {loadingUser
              ? 'Enregistrement...'
              : 'Valider les compléments entreprise (+50 % des points)'}
          </button>
        )}
      </div>
    </div>
  )
}
