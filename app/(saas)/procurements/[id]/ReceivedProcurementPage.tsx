import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'
import { PROCUREMENT_PHASES, QUESTION_TYPES, type ReceivedProcurement } from '@/lib/validations/procurement'
import { PROCUREMENT_STATUS_LABELS, procurementStatus } from '@/lib/procurement-status'
import { FOCUS_RING } from '../components/form-ui'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })

// Vue fournisseur en lecture seule (MAY-29) : ni pondérations ni autres fournisseurs.
export default function ReceivedProcurementPage({ procurement }: { procurement: ReceivedProcurement }) {
  const status = procurementStatus(procurement.deadline_at)
  const questions = procurement.custom_questions ?? []
  return <div className="min-h-screen bg-gray-50">
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard/registries" className={`text-xl font-extrabold text-[#0080A3] rounded ${FOCUS_RING}`}>MaydAI</Link>
        <Link href="/dashboard/registries" className={`inline-flex min-h-11 items-center gap-2 text-sm text-gray-600 hover:text-[#0080A3] rounded ${FOCUS_RING}`}><ArrowLeft size={16} aria-hidden="true" />Retour à mon compte</Link>
      </div>
    </header>
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:py-10">
      <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
        <Inbox size={20} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
        <p className="text-sm text-purple-900"><strong>{procurement.buyer_name}</strong> vous consulte en tant que fournisseur{procurement.supplier_email ? ` (${[procurement.supplier_company_name, procurement.supplier_email].filter(Boolean).join(' · ')})` : ''}.</p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'open' ? 'bg-[#E6F2F6] text-[#006280]' : 'bg-gray-200 text-gray-700'}`}>{PROCUREMENT_STATUS_LABELS[status]}</span>
          {procurement.phase && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{PROCUREMENT_PHASES[procurement.phase]}</span>}
        </div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 break-words">{procurement.title}</h1>
        <p className="mt-3 text-gray-700">Date limite de réponse : {procurement.deadline_at ? <><strong>{dateFormat.format(new Date(procurement.deadline_at))}</strong> · heure de Paris</> : 'Non renseignée'}</p>
      </section>

      <section aria-labelledby="received-need" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 id="received-need" className="text-lg font-semibold text-gray-900">Le besoin</h2>
        <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-gray-600">{procurement.description || 'Non renseigné'}</p>
      </section>

      <section aria-labelledby="received-questions" className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 id="received-questions" className="text-lg font-semibold text-gray-900">Ce qui vous sera demandé</h2>
        <p className="mt-1 text-sm text-gray-600">Les critères AI Act MaydAI, puis les questions de l’acheteur.</p>
        {questions.length ? <ol className="mt-4 space-y-2.5">{questions.map((question, index) => <li key={question.id} className="rounded-lg border border-gray-200 px-4 py-3.5">
          <p className="font-medium text-gray-900 break-words">{index + 1}. {question.label}</p>
          <p className="mt-1 text-[13px] text-gray-600">{QUESTION_TYPES[question.type]}</p>
        </li>)}</ol> : <p className="mt-4 text-sm text-gray-600">Aucune question sur mesure : seuls les critères AI Act MaydAI vous seront demandés.</p>}
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-4">
        <p className="text-sm text-gray-600">La réponse en ligne sera bientôt disponible.</p>
        <button type="button" disabled className="min-h-11 rounded-lg bg-gray-200 px-5 font-medium text-gray-600 cursor-not-allowed">Répondre</button>
      </div>
    </main>
  </div>
}
