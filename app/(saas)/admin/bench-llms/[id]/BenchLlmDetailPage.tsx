'use client'

import {
  AlertTriangle,
  ArrowLeft,
  Leaf,
  Loader2,
  Save,
  Trash2,
  Unlink,
} from 'lucide-react'
import Link from 'next/link'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/lib/auth'

type TabKey = 'maydai' | 'compl-ai' | 'comparia' | 'llm-stats' | 'ecologits'
type Benchmark = { id: string; code: string; name: string; principle_id: string }
type Principle = { id: string; code: string; name: string; category: string; benchmarks: Benchmark[] }
type Evaluation = {
  id: string
  model_id: string
  score: number | null
  score_text: string | null
  maydai_score: number | null
  rang_compar_ia: number | null
  evaluation_date: string
  principle: { id: string; code: string; name: string; category: string } | null
  benchmark: Benchmark | null
}
type CanonicalModel = {
  id: string
  model_name: string
  model_provider: string
  model_type: string | null
  version: string | null
  llm_stats_id: string | null
  llm_leader_rank: number | null
  comparia_rank: number | null
  input_cost_per_million: number | null
  output_cost_per_million: number | null
  model_size: string | null
  gpqa_score: number | null
  aime_2025_score: number | null
  license: string | null
  context_length: number | null
  release_date: string | null
  knowledge_cutoff: string | null
}
type EcoEstimate = Record<string, number | string | null> & {
  output_token_count: number
  electricity_mix_zone: string
  estimated_at: string
}
type EcoModel = {
  id: string
  provider: string
  name: string
  architecture: unknown
  sources: unknown[]
  warnings: Array<{ code?: string; message?: string }>
  is_active: boolean
  last_seen_at: string
  estimate: EcoEstimate | EcoEstimate[] | null
  link: Array<{ maydai_model_id: string; match_method: string }> | null
}
type MaydaiOption = { id: string; model_name: string; model_provider: string | null }
type CompariaModel = {
  source_id: string
  rank: number
  bradley_terry_score: number
  bt_p2_5: number | null
  bt_p97_5: number | null
  confidence_interval: string | null
  rank_p2_5: number | null
  rank_p97_5: number | null
  total_votes: number
  consumption_mwh_per_1k_tokens: number | null
  size: string | null
  parameters_billions: number | null
  architecture: string | null
  release_date: string | null
  organisation: string
  license: string | null
  last_imported_at: string
}
type DetailResponse = {
  entityId: string
  model: CanonicalModel | null
  evaluations: Evaluation[]
  ecologits: EcoModel | null
  comparia: CompariaModel | null
  principles: Principle[]
  maydaiModels: MaydaiOption[]
  role: 'admin' | 'super_admin'
  error?: string
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'maydai', label: 'MaydAI' },
  { key: 'compl-ai', label: 'COMPL-AI' },
  { key: 'comparia', label: 'Compar:IA' },
  { key: 'llm-stats', label: 'LLM Stats' },
  { key: 'ecologits', label: 'EcoLogits' },
]
const IMPACTS = [
  ['energy', 'Énergie'],
  ['gwp', 'Climat (GWP)'],
  ['adpe', 'Ressources (ADPe)'],
  ['pe', 'Énergie primaire'],
  ['wcf', 'Eau (WCF)'],
] as const

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function formatRange(estimate: EcoEstimate | null, key: string) {
  const min = estimate?.[`${key}_min`]
  const max = estimate?.[`${key}_max`]
  const unit = estimate?.[`${key}_unit`]
  if (typeof min !== 'number' || typeof max !== 'number') return 'Non disponible'
  const formatter = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 })
  return `${formatter.format(min)} – ${formatter.format(max)} ${unit ?? ''}`
}

function EmptySource({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">{children}</div>
}

export default function BenchLlmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <BenchLlmDetailContent id={id} />
}

type BenchLlmDetailContentProps = {
  id: string
  modal?: boolean
  onClose?: () => void
  onDeleted?: () => void
}

export function BenchLlmDetailContent({
  id,
  modal = false,
  onClose,
  onDeleted,
}: BenchLlmDetailContentProps) {
  const router = useRouter()
  const { getAccessToken } = useAuth()
  const [data, setData] = useState<DetailResponse | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('maydai')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [modelForm, setModelForm] = useState({ model_name: '', model_provider: '', model_type: 'large-language-model', version: '' })
  const [newBenchmark, setNewBenchmark] = useState('')
  const [newScore, setNewScore] = useState('0.5')
  const [selectedMaydaiId, setSelectedMaydaiId] = useState('')

  const fetchDetail = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/bench-llms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json()) as DetailResponse
      if (!response.ok) throw new Error(payload.error || 'Détail impossible')
      setData(payload)
      if (payload.model) {
        setModelForm({
          model_name: payload.model.model_name,
          model_provider: payload.model.model_provider,
          model_type: payload.model.model_type ?? 'large-language-model',
          version: payload.model.version ?? '',
        })
      }
      setSelectedMaydaiId(first(payload.ecologits?.link)?.maydai_model_id ?? '')
      if (!modal && payload.entityId !== id) {
        router.replace(`/admin/bench-llms/${payload.entityId}`)
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, id, modal, router])

  useEffect(() => void fetchDetail(), [fetchDetail])

  const mutate = useCallback(async (name: string, url: string, options: RequestInit) => {
    const token = getAccessToken()
    if (!token) return false
    setSaving(name)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || `${name} impossible`)
      setMessage(`${name} enregistré.`)
      await fetchDetail()
      return true
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Erreur inconnue')
      return false
    } finally {
      setSaving(null)
    }
  }, [fetchDetail, getAccessToken])

  const model = data?.model ?? null
  const evaluations = useMemo(() => data?.evaluations ?? [], [data?.evaluations])
  const eco = data?.ecologits ?? null
  const comparia = data?.comparia ?? null
  const estimate = first(eco?.estimate)
  const allBenchmarks = useMemo(
    () => (data?.principles ?? []).flatMap((principle) => principle.benchmarks),
    [data?.principles],
  )
  const maydaiAverages = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const evaluation of evaluations) {
      if (evaluation.maydai_score == null) continue
      const label = evaluation.principle?.name ?? 'Sans principe'
      groups.set(label, [...(groups.get(label) ?? []), evaluation.maydai_score])
    }
    return [...groups].map(([label, scores]) => ({
      label,
      value: scores.reduce((sum, value) => sum + value, 0) / scores.length,
    }))
  }, [evaluations])

  if (loading && !data) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0080A3]" /></div>
  if (!data) return <div className="rounded-md bg-red-50 p-4 text-red-800">{error ?? 'Modèle introuvable'}</div>

  const title = model?.model_name ?? eco?.name ?? comparia?.source_id ?? 'Modèle'
  const provider = model?.model_provider ?? eco?.provider ?? comparia?.organisation ?? '—'

  return (
    <div className="pb-12">
      {modal ? null : <Link href="/admin/bench-llms" className="inline-flex items-center gap-2 text-sm font-medium text-[#0080A3]"><ArrowLeft className="h-4 w-4" /> Retour aux modèles</Link>}
      <div className={`${modal ? '' : 'mt-4'} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
        <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="mt-1 text-gray-600">{provider}</p></div>
        {model ? <button onClick={async () => { if (confirm(`Supprimer définitivement ${title} et ses évaluations ?`)) { const ok = await mutate('Suppression', `/api/admin/compl-ai/models/${model.id}`, { method: 'DELETE' }); if (ok) { if (modal) { onDeleted?.(); onClose?.() } else { router.push('/admin/bench-llms') } } } }} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700"><Trash2 className="h-4 w-4" /> Supprimer le modèle</button> : null}
      </div>
      {error ? <div className="mt-4 flex gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="h-4 w-4" /> {error}</div> : null}
      {message ? <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

      <div className="mt-6 overflow-x-auto border-b border-gray-200">
        <nav className="flex min-w-max gap-1">
          {TABS.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.key ? 'border-[#0080A3] text-[#0080A3]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{tab.label}</button>)}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'maydai' ? (
          maydaiAverages.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{maydaiAverages.map((item) => <div key={item.label} className="rounded-lg border bg-white p-4"><div className="text-sm text-gray-500">{item.label}</div><div className="mt-2 text-2xl font-bold text-[#0080A3]">{item.value.toFixed(2)}</div></div>)}</div> : <EmptySource>Aucun score MaydAI calculé pour ce modèle.</EmptySource>
        ) : null}

        {activeTab === 'compl-ai' ? (
          model ? <div className="space-y-6">
            <section className="rounded-lg border bg-white p-5">
              <h2 className="font-semibold text-gray-900">Métadonnées du modèle</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input value={modelForm.model_name} onChange={(event) => setModelForm((value) => ({ ...value, model_name: event.target.value }))} className="rounded-md border px-3 py-2" />
                <input value={modelForm.model_provider} onChange={(event) => setModelForm((value) => ({ ...value, model_provider: event.target.value }))} className="rounded-md border px-3 py-2" />
                <input value={modelForm.model_type} onChange={(event) => setModelForm((value) => ({ ...value, model_type: event.target.value }))} className="rounded-md border px-3 py-2" />
                <input value={modelForm.version} onChange={(event) => setModelForm((value) => ({ ...value, version: event.target.value }))} className="rounded-md border px-3 py-2" placeholder="Version" />
              </div>
              <button onClick={() => mutate('Modèle', `/api/admin/compl-ai/models/${model.id}`, { method: 'PUT', body: JSON.stringify(modelForm) })} disabled={saving != null} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0080A3] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save className="h-4 w-4" /> Enregistrer</button>
            </section>
            <section className="rounded-lg border bg-white p-5">
              <h2 className="font-semibold text-gray-900">Ajouter une évaluation</h2>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select value={newBenchmark} onChange={(event) => setNewBenchmark(event.target.value)} className="min-w-0 flex-1 rounded-md border px-3 py-2"><option value="">Choisir un benchmark…</option>{allBenchmarks.map((benchmark) => <option key={benchmark.id} value={benchmark.code}>{benchmark.code} — {benchmark.name}</option>)}</select>
                <input type="number" min="0" max="1" step="0.01" value={newScore} onChange={(event) => setNewScore(event.target.value)} className="w-28 rounded-md border px-3 py-2" />
                <button disabled={!newBenchmark || saving != null} onClick={() => mutate('Évaluation', '/api/admin/compl-ai/scores', { method: 'POST', body: JSON.stringify({ modelId: model.id, benchmarkCode: newBenchmark, score: Number(newScore) }) })} className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Ajouter</button>
              </div>
            </section>
            <div className="space-y-3">{evaluations.map((evaluation) => <EvaluationEditor key={evaluation.id} evaluation={evaluation} modelId={model.id} saving={saving} mutate={mutate} />)}</div>
          </div> : <EmptySource>Ce modèle EcoLogits doit être lié à MaydAI avant de recevoir des données COMPL-AI.</EmptySource>
        ) : null}

        {activeTab === 'comparia' ? (
          comparia ? <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Identifiant Compar:IA', comparia.source_id],
                ['Rang', comparia.rank],
                ['Score Bradley–Terry', comparia.bradley_terry_score],
                ['Intervalle du score', comparia.bt_p2_5 != null && comparia.bt_p97_5 != null ? `${comparia.bt_p2_5} – ${comparia.bt_p97_5}` : '—'],
                ['Intervalle du rang', comparia.rank_p2_5 != null && comparia.rank_p97_5 != null ? `${comparia.rank_p2_5} – ${comparia.rank_p97_5}` : '—'],
                ['Confiance', comparia.confidence_interval],
                ['Votes', comparia.total_votes],
                ['Consommation / 1 000 tokens', comparia.consumption_mwh_per_1k_tokens != null ? `${comparia.consumption_mwh_per_1k_tokens} mWh` : '—'],
                ['Taille', comparia.size],
                ['Paramètres', comparia.parameters_billions != null ? `${comparia.parameters_billions} Md` : '—'],
                ['Architecture', comparia.architecture],
                ['Organisation', comparia.organisation],
                ['Licence', comparia.license],
                ['Date de sortie', comparia.release_date],
                ['Dernier import', new Date(comparia.last_imported_at).toLocaleString('fr-FR')],
              ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-white p-4"><div className="text-xs uppercase text-gray-500">{label}</div><div className="mt-2 font-semibold text-gray-900">{value ?? '—'}</div></div>)}
            </div>
            {model && evaluations.length > 0 ? <section className="space-y-3"><h2 className="font-semibold text-gray-900">Valeurs Compar:IA historiques saisies sur les évaluations</h2>{evaluations.map((evaluation) => <CompariaEditor key={evaluation.id} evaluation={evaluation} saving={saving} mutate={mutate} />)}</section> : null}
          </div> : model ? <div className="space-y-4">
            <div className="rounded-lg border bg-white p-5"><div className="text-sm text-gray-500">Ancien rang Compar:IA du modèle</div><div className="mt-1 text-2xl font-bold">{model.comparia_rank ?? 'Non renseigné'}</div></div>
            {evaluations.length > 0 ? evaluations.map((evaluation) => <CompariaEditor key={evaluation.id} evaluation={evaluation} saving={saving} mutate={mutate} />) : <EmptySource>Aucune donnée Compar:IA importée pour ce modèle.</EmptySource>}
          </div> : <EmptySource>Aucune donnée Compar:IA importée pour ce modèle.</EmptySource>
        ) : null}

        {activeTab === 'llm-stats' ? (
          model?.llm_stats_id ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Identifiant LLM Stats', model.llm_stats_id],
              ['Rang', model.llm_leader_rank],
              ['Prix entrée / million', model.input_cost_per_million],
              ['Prix sortie / million', model.output_cost_per_million],
              ['Taille', model.model_size],
              ['GPQA', model.gpqa_score],
              ['AIME 2025', model.aime_2025_score],
              ['Licence', model.license],
              ['Contexte', model.context_length],
              ['Date de sortie', model.release_date],
              ['Knowledge cutoff', model.knowledge_cutoff],
            ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-white p-4"><div className="text-xs uppercase text-gray-500">{label}</div><div className="mt-2 font-semibold text-gray-900">{value ?? '—'}</div></div>)}
          </div> : <EmptySource>Aucune donnée LLM Stats pour ce modèle.</EmptySource>
        ) : null}

        {activeTab === 'ecologits' ? (
          eco ? <div className="space-y-6">
            <section className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-5">
              <div className="flex items-center gap-2"><Leaf className="h-5 w-5 text-emerald-700" /><h2 className="font-semibold">Impacts pour 1 000 tokens · FRA</h2></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{IMPACTS.map(([key, label]) => <div key={key} className="rounded-md bg-white p-3"><div className="text-xs uppercase text-gray-500">{label}</div><div className="mt-1 font-semibold">{formatRange(estimate, key)}</div></div>)}</div>
            </section>
            <section className="rounded-lg border bg-white p-5">
              <h2 className="font-semibold">Liaison MaydAI</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <select value={selectedMaydaiId} onChange={(event) => setSelectedMaydaiId(event.target.value)} className="min-w-0 flex-1 rounded-md border px-3 py-2"><option value="">Choisir un modèle…</option>{data.maydaiModels.map((option) => <option key={option.id} value={option.id}>{option.model_provider ?? '—'} / {option.model_name}</option>)}</select>
                <button disabled={!selectedMaydaiId || saving != null} onClick={() => mutate('Liaison EcoLogits', `/api/admin/ecologits/models/${eco.id}/link`, { method: 'PUT', body: JSON.stringify({ maydaiModelId: selectedMaydaiId }) })} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Lier</button>
                {first(eco.link) ? <button disabled={saving != null} onClick={() => mutate('Déliaison EcoLogits', `/api/admin/ecologits/models/${eco.id}/link`, { method: 'PUT', body: JSON.stringify({ maydaiModelId: null }) })} className="inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm"><Unlink className="h-4 w-4" /> Délier</button> : null}
              </div>
            </section>
            {eco.warnings.length > 0 ? <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Avertissements</h2><ul className="mt-3 space-y-2">{eco.warnings.map((warning, index) => <li key={`${warning.code}-${index}`} className="rounded bg-amber-50 p-3 text-sm text-amber-900">{warning.code ?? 'Avertissement'} — {warning.message}</li>)}</ul></section> : null}
            <section className="rounded-lg border bg-white p-5"><h2 className="font-semibold">Architecture</h2><pre className="mt-3 overflow-x-auto rounded bg-gray-950 p-4 text-xs text-gray-100">{JSON.stringify(eco.architecture ?? {}, null, 2)}</pre></section>
          </div> : <EmptySource>Aucune donnée EcoLogits pour ce modèle.</EmptySource>
        ) : null}
      </div>
    </div>
  )
}

function EvaluationEditor({ evaluation, modelId, saving, mutate }: { evaluation: Evaluation; modelId: string; saving: string | null; mutate: (name: string, url: string, options: RequestInit) => Promise<boolean> }) {
  const [score, setScore] = useState(String(evaluation.score ?? ''))
  const benchmarkCode = evaluation.benchmark?.code
  return <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1"><div className="font-medium">{benchmarkCode ?? 'Benchmark'} — {evaluation.benchmark?.name ?? ''}</div><div className="text-xs text-gray-500">{evaluation.principle?.name ?? 'Sans principe'} · {evaluation.evaluation_date}</div></div>
    <input type="number" min="0" max="1" step="0.01" value={score} onChange={(event) => setScore(event.target.value)} className="w-28 rounded-md border px-3 py-2" />
    <button disabled={!benchmarkCode || saving != null} onClick={() => mutate('Score COMPL-AI', '/api/admin/compl-ai/scores', { method: 'PUT', body: JSON.stringify({ modelId, benchmarkCode, score: Number(score), evaluation_id: evaluation.id }) })} className="rounded-md bg-[#0080A3] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Enregistrer</button>
    <button disabled={saving != null} onClick={() => { if (confirm('Supprimer cette évaluation ?')) void mutate('Suppression du score', `/api/admin/compl-ai/scores/${evaluation.id}`, { method: 'DELETE' }) }} className="rounded-md border border-red-200 p-2 text-red-700"><Trash2 className="h-4 w-4" /></button>
  </div>
}

function CompariaEditor({ evaluation, saving, mutate }: { evaluation: Evaluation; saving: string | null; mutate: (name: string, url: string, options: RequestInit) => Promise<boolean> }) {
  const [rank, setRank] = useState(String(evaluation.rang_compar_ia ?? ''))
  return <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1"><div className="font-medium">{evaluation.benchmark?.name ?? 'Évaluation'}</div><div className="text-xs text-gray-500">{evaluation.principle?.name}</div></div>
    <input type="number" min="0" max="20" step="0.1" value={rank} onChange={(event) => setRank(event.target.value)} placeholder="0–20" className="w-28 rounded-md border px-3 py-2" />
    <button disabled={saving != null} onClick={() => mutate('Rang Compar:IA', `/api/admin/compl-ai/evaluations/${evaluation.id}`, { method: 'PATCH', body: JSON.stringify({ rang_compar_ia: rank === '' ? null : Number(rank) }) })} className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Enregistrer</button>
  </div>
}
