'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, FileText, Plus, X } from 'lucide-react'
import { z } from 'zod'
import { useApiClient } from '@/lib/api-client'
import { DEFAULT_IMPORTANCE, normalizeSupplierEmails, PROCUREMENT_PHASES, ProcurementInputSchema, type ProcurementInput, type ProcurementQuestion } from '@/lib/validations/procurement'
import { parisDeadlineToUtc } from '@/lib/validations/procurement-deadline'
import CriteriaFields from '../components/CriteriaFields'
import CustomQuestionFields from '../components/CustomQuestionFields'
import { errorProps, FieldError, fieldId, FOCUS_RING, FormSection, INPUT_STYLE, PRIMARY_BUTTON, type FieldErrors } from '../components/form-ui'

export default function NewProcurementForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [phase, setPhase] = useState<ProcurementInput['phase']>('consultation')
  const [criteria, setCriteria] = useState({ ...DEFAULT_IMPORTANCE })
  const [questions, setQuestions] = useState<ProcurementQuestion[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [emails, setEmails] = useState<string[]>([])
  const [emailDraft, setEmailDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const pending = useRef(false)
  const errorSummary = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { postJson } = useApiClient()

  useEffect(() => { if (Object.keys(fieldErrors).length) errorSummary.current?.focus() }, [fieldErrors])
  function collectedEmails() { return normalizeSupplierEmails([...emails, ...emailDraft.split(/[,\n]+/)]) }
  function commitEmails() {
    if (!emailDraft.trim()) return
    const candidates = collectedEmails()
    if (candidates.some((email) => !z.string().email().safeParse(email).success)) {
      setFieldErrors((current) => ({ ...current, supplier_emails: 'Vérifiez les adresses email des fournisseurs.' }))
      return
    }
    setEmails(candidates); setEmailDraft('')
    setFieldErrors((current) => { const next = { ...current }; delete next.supplier_emails; return next })
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    setError(null)
    const deadline = parisDeadlineToUtc(date, time)
    const parsed = ProcurementInputSchema.safeParse({ title, description, phase, criteria_importance: criteria, custom_questions: questions, deadline_at: deadline ?? '', supplier_emails: collectedEmails() })
    if (!parsed.success) {
      const errors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] === 'supplier_emails' ? 'supplier_emails' : issue.path.join('.')
        errors[path] ??= path === 'deadline_at' && !deadline ? 'Renseignez une date et une heure de clôture valides (heure de Paris).' : issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setEmails(parsed.data.supplier_emails); setEmailDraft('')
    pending.current = true; setLoading(true)
    try {
      const response = await postJson('/api/procurements', parsed.data)
      if (response.status === 401) { router.push('/login'); return }
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        if (Array.isArray(body?.issues)) {
          const errors: FieldErrors = {}
          for (const issue of body.issues) {
            if (typeof issue.path === 'string' && typeof issue.message === 'string') errors[issue.path.startsWith('supplier_emails') ? 'supplier_emails' : issue.path] = issue.message
          }
          setFieldErrors(errors)
        }
        throw new Error(body?.error ?? 'Impossible de créer l’appel d’offres. Veuillez réessayer.')
      }
      if (!z.string().uuid().safeParse(body?.id).success) throw new Error('La confirmation de création est invalide. Veuillez recharger votre compte.')
      router.push(`/procurements/${body.id}?procurementCreated=true`)
    } catch (failure) {
      setError(failure instanceof TypeError ? 'Impossible de créer l’appel d’offres. Votre saisie est conservée, veuillez réessayer.' : failure instanceof Error ? failure.message : 'Impossible de créer l’appel d’offres. Veuillez réessayer.')
      pending.current = false; setLoading(false)
    }
  }

  return <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/registries" className={`inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 hover:text-[#0080A3] rounded ${FOCUS_RING}`}><ArrowLeft size={18} aria-hidden="true" />Retour à mon compte</Link>
      <div className="flex items-start gap-4 mt-4"><div className="hidden sm:block rounded-xl bg-[#0080A3]/10 p-3"><FileText size={28} className="text-[#0080A3]" aria-hidden="true" /></div><div><h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Créer un appel d’offres</h1><p className="mt-2 text-gray-600">Définissez votre besoin et les priorités de votre évaluation des usages de l’IA.</p><p className="mt-2 text-sm text-gray-500">Tous les champs sont obligatoires, sauf les questions sur mesure. Aucun email ne sera envoyé à cette étape.</p></div></div>
      <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="mt-8 space-y-6">
        {Object.keys(fieldErrors).length > 0 && <div ref={errorSummary} tabIndex={-1} role="alert" className={`rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 ${FOCUS_RING}`}><h2 className="font-semibold">Vérifiez les champs suivants</h2><ul className="mt-2 space-y-1 list-disc pl-5">{Object.entries(fieldErrors).map(([path, message]) => <li key={path}><a href={`#${fieldId(path)}`} className="underline">{message}</a></li>)}</ul></div>}
        <FormSection number={1} title="Contexte et objectifs" description="Présentez le besoin et choisissez la phase de votre appel d’offres.">
          <label htmlFor={fieldId('title')} className="block text-sm font-medium text-gray-700 mb-2">Titre de l’appel d’offres</label><input id={fieldId('title')} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required disabled={loading} placeholder="Ex : Agence marketing — campagnes 2027" className={INPUT_STYLE} {...errorProps('title', fieldErrors)} /><FieldError path="title" errors={fieldErrors} />
          <fieldset id={fieldId('phase')} tabIndex={-1} className="mt-5" {...errorProps('phase', fieldErrors)}><legend className="text-sm font-medium text-gray-700 mb-2">Phase</legend><div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 p-1">{Object.entries(PROCUREMENT_PHASES).map(([value, label]) => <label key={value} className="relative cursor-pointer"><input type="radio" name="phase" value={value} checked={phase === value} onChange={() => setPhase(value as ProcurementInput['phase'])} disabled={loading} className="peer sr-only" /><span className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 ${phase === value ? 'bg-[#0080A3] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</span></label>)}</div><FieldError path="phase" errors={fieldErrors} /></fieldset>
          <label htmlFor={fieldId('description')} className="block text-sm font-medium text-gray-700 mt-5 mb-2">Description du besoin</label><textarea id={fieldId('description')} value={description} onChange={(event) => setDescription(event.target.value)} required rows={5} maxLength={5000} disabled={loading} placeholder="Décrivez la prestation attendue, son contexte et vos objectifs." className={`${INPUT_STYLE} resize-y min-h-36`} {...errorProps('description', fieldErrors)} /><div className="mt-1 text-right text-xs text-gray-500">{description.length.toLocaleString('fr-FR')} / 5 000 caractères</div><FieldError path="description" errors={fieldErrors} />
        </FormSection>
        <FormSection number={2} title="Critères Maydai" description="Réglez l’importance de chaque critère. À 0, le critère reste présent avec une priorité minimale."><CriteriaFields values={criteria} onChange={(id, value) => setCriteria((current) => ({ ...current, [id]: value }))} disabled={loading} errors={fieldErrors} /></FormSection>
        <FormSection number={3} title="Questions sur mesure" description="Facultatives. Complétez votre future collecte avec vos questions métier."><CustomQuestionFields questions={questions} onChange={(items) => { setQuestions(items); setFieldErrors({}) }} disabled={loading} errors={fieldErrors} /></FormSection>
        <FormSection number={4} title="Fournisseurs et échéance" description="Enregistrez les destinataires prévus et la date limite de réponse.">
          <div className="grid sm:grid-cols-2 gap-4"><div><label htmlFor={fieldId('deadline_at')} className="block text-sm font-medium text-gray-700 mb-2">Date limite</label><input id={fieldId('deadline_at')} type="date" required disabled={loading} value={date} onChange={(event) => setDate(event.target.value)} className={INPUT_STYLE} {...errorProps('deadline_at', fieldErrors)} /></div><div><label htmlFor="procurement-deadline-time" className="block text-sm font-medium text-gray-700 mb-2">Heure de clôture</label><input id="procurement-deadline-time" type="time" required disabled={loading} value={time} onChange={(event) => setTime(event.target.value)} className={INPUT_STYLE} {...errorProps('deadline_at', fieldErrors)} /></div></div><p className="mt-2 text-sm text-gray-500">Heure de Paris · Europe/Paris</p><FieldError path="deadline_at" errors={fieldErrors} />
          <label htmlFor={fieldId('supplier_emails')} className="block text-sm font-medium text-gray-700 mt-5 mb-2">Emails des fournisseurs prévus</label>
          {emails.length > 0 && <ul className="flex flex-wrap gap-2 mb-3">{emails.map((email) => <li key={email} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 pl-3"><span className="min-w-0 break-all text-sm text-gray-700">{email}</span><button type="button" disabled={loading} onClick={() => setEmails((current) => current.filter((item) => item !== email))} aria-label={`Retirer ${email}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-gray-200 ${FOCUS_RING}`}><X size={16} aria-hidden="true" /></button></li>)}</ul>}
          <div className="flex flex-col sm:flex-row gap-2"><input id={fieldId('supplier_emails')} type="text" inputMode="email" autoComplete="off" value={emailDraft} disabled={loading} onChange={(event) => setEmailDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commitEmails() } }} placeholder="contact@fournisseur.fr" className={INPUT_STYLE} {...errorProps('supplier_emails', fieldErrors)} /><button type="button" disabled={loading} onClick={commitEmails} className={`inline-flex shrink-0 min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-[#0080A3] hover:bg-gray-50 ${FOCUS_RING}`}><Plus size={18} aria-hidden="true" />Ajouter</button></div><p className="mt-2 text-sm text-gray-500">Entrée ou virgule pour ajouter · {emails.length} fournisseur{emails.length > 1 ? 's' : ''} prévu{emails.length > 1 ? 's' : ''}</p><FieldError path="supplier_emails" errors={fieldErrors} />
        </FormSection>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-4"><Link href="/dashboard/registries" aria-disabled={loading} tabIndex={loading ? -1 : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2.5 text-gray-700 hover:bg-gray-100 font-medium ${FOCUS_RING} ${loading ? 'pointer-events-none opacity-60' : ''}`}>Annuler</Link><button type="submit" disabled={loading} className={PRIMARY_BUTTON}>{loading ? 'Création en cours…' : 'Créer l’appel d’offres'}<ArrowRight size={18} aria-hidden="true" /></button></div>
      </form>
    </div>
  </main>
}
