'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, FileText, Inbox, Mail, MessageSquare, TrendingUp, Users } from 'lucide-react'
import Toast from '@/components/Toast'
import { useApiClient } from '@/lib/api-client'
import { PROCUREMENT_CRITERIA, PROCUREMENT_PHASES, QUESTION_TYPES, type Procurement } from '@/lib/validations/procurement'
import ProcurementSidebar from '../components/ProcurementSidebar'
import { FOCUS_RING, PRIMARY_BUTTON } from '../components/form-ui'
import ProcurementNotFound from './ProcurementNotFound'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })
export default function ProcurementDashboardPage({ id, initialProcurement, initialError }: { id: string; initialProcurement: Procurement | null; initialError: boolean }) {
  const [procurement, setProcurement] = useState(initialProcurement)
  const [error, setError] = useState(initialError)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(false)
  const pending = useRef(false)
  const notified = useRef(false)
  const closeToast = useCallback(() => setToast(false), [])
  const params = useSearchParams()
  const router = useRouter()
  const { get } = useApiClient()
  useEffect(() => { setProcurement(initialProcurement); setError(initialError) }, [initialProcurement, initialError])
  useEffect(() => {
    if (params.get('procurementCreated') !== 'true' || !procurement || notified.current) return
    notified.current = true; setToast(true)
    const query = new URLSearchParams(params.toString()); query.delete('procurementCreated')
    const remaining = query.toString()
    router.replace(`/procurements/${id}${remaining ? `?${remaining}` : ''}`, { scroll: false })
  }, [params, router, id, procurement])
  async function retry() {
    if (pending.current) return
    pending.current = true; setLoading(true)
    try {
      const response = await get(`/api/procurements/${id}`)
      if (response.status === 401) { router.push('/login'); return }
      if (response.status === 404) { setMissing(true); return }
      if (!response.ok) throw new Error('Chargement impossible')
      setProcurement(await response.json()); setError(false)
    } catch { setError(true) } finally { pending.current = false; setLoading(false) }
  }
  if (missing) return <ProcurementNotFound />
  const emails = procurement?.supplier_emails ?? []
  const questions = procurement?.custom_questions ?? []
  const stats = [{ label: 'Fournisseurs prévus', value: emails.length, icon: Users }, { label: 'Invitations envoyées', value: 0, icon: Mail }, { label: 'Réponses reçues', value: 0, icon: MessageSquare }, { label: 'Taux de réponse', value: '—', icon: TrendingUp }]
  return <div className="min-h-screen bg-gray-50">
    <a href="#overview" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Aller au contenu</a>
    <ProcurementSidebar contentReady={!error && Boolean(procurement)} />
    <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {error || !procurement ? <section className="rounded-xl border border-red-200 bg-white p-6" aria-busy={loading}><h1 className="text-xl font-bold text-gray-900">Dashboard de l’appel d’offres</h1><p role="alert" className="mt-3 text-red-800">Impossible de charger l’appel d’offres. Veuillez réessayer.</p><button type="button" disabled={loading} onClick={() => void retry()} className={`${PRIMARY_BUTTON} mt-4`}>{loading ? 'Chargement…' : 'Réessayer'}</button><Link href="/dashboard/registries" className={`ml-4 inline-flex min-h-11 items-center text-gray-600 rounded ${FOCUS_RING}`}>Retour à mon compte</Link></section> : <>
        <section id="overview" tabIndex={-1} aria-labelledby="procurement-dashboard-title" className="rounded-xl bg-white shadow-sm p-5 sm:p-6 scroll-mt-6">
          <Link href="/dashboard/registries" className={`inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 hover:text-[#0080A3] rounded ${FOCUS_RING}`}><ArrowLeft size={18} aria-hidden="true" />Retour à mon compte</Link>
          <div className="flex items-start gap-3 mt-3"><div className="rounded-lg bg-[#0080A3]/10 p-3 shrink-0"><FileText size={28} className="text-[#0080A3]" aria-hidden="true" /></div><div className="min-w-0"><h1 id="procurement-dashboard-title" className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{procurement.title}</h1><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{procurement.phase ? PROCUREMENT_PHASES[procurement.phase] : 'Phase : Non renseigné'}</span><span className="rounded-full bg-[#0080A3]/10 px-3 py-1 text-xs font-medium text-[#0080A3]">À préparer</span></div></div></div>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600"><Calendar size={16} aria-hidden="true" />Clôture : {procurement.deadline_at ? `${dateFormat.format(new Date(procurement.deadline_at))} · heure de Paris` : 'Non renseigné'}</p>
          <p className="mt-3 text-sm text-gray-500">Aucune invitation n’a encore été envoyée.</p>
        </section>
        <section aria-label="Statistiques de l’appel d’offres" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">{stats.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-xl bg-white p-4 sm:p-6 shadow-sm"><div className="inline-flex rounded-lg bg-[#0080A3]/10 p-2 mb-3"><Icon size={22} className="text-[#0080A3]" aria-hidden="true" /></div><p className="text-sm text-gray-600">{label}</p><p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value === '—' ? <><span aria-hidden="true">—</span><span className="sr-only">Non disponible</span></> : value}</p></article>)}</section>
        <div className="grid lg:grid-cols-2 gap-6">
          <section aria-labelledby="supplier-responses-title" className="rounded-xl bg-white p-5 sm:p-6 shadow-sm"><h2 id="supplier-responses-title" className="text-lg font-semibold text-gray-900">Réponses des fournisseurs</h2><div className="py-9 text-center"><Inbox size={36} className="mx-auto text-gray-400" aria-hidden="true" /><p className="mt-4 font-medium text-gray-900">Aucune réponse pour le moment</p><p className="mt-2 text-sm text-gray-600">Les réponses apparaîtront ici lorsque les invitations et la collecte seront disponibles.</p></div></section>
          <section aria-labelledby="procurement-scores-title" className="rounded-xl bg-white p-5 sm:p-6 shadow-sm"><h2 id="procurement-scores-title" className="text-lg font-semibold text-gray-900">Synthèse des évaluations</h2><div className="py-9 text-center"><TrendingUp size={36} className="mx-auto text-gray-400" aria-hidden="true" /><p className="mt-4 font-medium text-gray-900">Aucun score disponible</p><p className="mt-2 text-sm text-gray-600">Les scores seront disponibles après la collecte et l’évaluation des réponses fournisseurs.</p></div></section>
        </div>
        <section id="suppliers" tabIndex={-1} aria-labelledby="procurement-suppliers-title" className="rounded-xl bg-white p-5 sm:p-6 shadow-sm scroll-mt-6"><h2 id="procurement-suppliers-title" className="text-lg font-semibold text-gray-900">Fournisseurs prévus</h2>{emails.length ? <ul className="mt-4 divide-y divide-gray-100">{emails.map((email) => <li key={email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4"><span className="min-w-0 break-all text-sm text-gray-900">{email}</span><span className="w-fit shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Non invité</span></li>)}</ul> : <p className="mt-4 text-sm text-gray-600">Non renseigné</p>}</section>
        <section id="configuration" tabIndex={-1} aria-labelledby="procurement-configuration-title" className="rounded-xl bg-white p-5 sm:p-6 shadow-sm scroll-mt-6"><h2 id="procurement-configuration-title" className="text-lg font-semibold text-gray-900">Configuration de l’appel d’offres</h2><h3 className="mt-6 font-medium text-gray-900">Description du besoin</h3><p className="mt-2 whitespace-pre-line break-words text-gray-600">{procurement.description || 'Non renseigné'}</p>
          <h3 className="mt-6 font-medium text-gray-900">Importance des critères Maydai</h3><p className="mt-1 text-sm text-gray-500">Une importance de 0 conserve le critère avec une priorité minimale.</p><dl className="mt-4 grid sm:grid-cols-2 gap-5">{PROCUREMENT_CRITERIA.map(({ id: criterionId, label }) => { const value = procurement.criteria_importance?.[criterionId]; return <div key={criterionId}><div className="flex items-center justify-between gap-3 text-sm"><dt className="text-gray-700">{label}</dt><dd className="font-semibold text-gray-900 shrink-0">{value === undefined ? 'Non renseigné' : `${value} / 10`}</dd></div>{value !== undefined && <div aria-hidden="true" className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full bg-[#0080A3]" style={{ width: `${value * 10}%` }} /></div>}</div> })}</dl>
          <h3 className="mt-8 font-medium text-gray-900">Questions sur mesure</h3>{questions.length ? <ol className="mt-4 space-y-4">{questions.map((question, index) => <li key={question.id} className="rounded-lg border border-gray-200 p-4"><p className="font-medium text-gray-900 break-words">{index + 1}. {question.label}</p><p className="mt-1 text-sm text-gray-500">{QUESTION_TYPES[question.type]}</p>{(question.type === 'single_choice' || question.type === 'multiple_choice') && <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">{question.options.map((option) => <li key={option} className="break-words">{option}</li>)}</ul>}</li>)}</ol> : <p className="mt-2 text-sm text-gray-600">Aucune question sur mesure</p>}
        </section>
      </>}
      {toast && <Toast message="L’appel d’offres a été créé avec succès." isVisible onClose={closeToast} duration={5000} />}
    </main>
  </div>
}
