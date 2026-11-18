'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { useApiClient } from '@/lib/api-client'
import { ProcurementSupplierInputSchema, type ProcurementSupplier } from '@/lib/validations/procurement'
import SupplierFields, { formatSiren, type CompanySelection } from '../components/SupplierFields'
import { FOCUS_RING, PRIMARY_BUTTON } from '../components/form-ui'

interface Props {
  procurementId: string
  suppliers: ProcurementSupplier[]
  onChange: (suppliers: ProcurementSupplier[]) => void
}

export default function ProcurementSuppliersSection({ procurementId, suppliers, onChange }: Props) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [company, setCompany] = useState<CompanySelection | null>(null)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const { postJson, delete: deleteRequest } = useApiClient()
  const router = useRouter()

  function openPanel(prefillEmail: string | null = null) {
    setPanelOpen(true); setCompleting(prefillEmail); setEmail(prefillEmail ?? ''); setCompany(null); setError(null); setMessage(null)
  }
  function closePanel() { setPanelOpen(false); setCompleting(null); setError(null); addButton.current?.focus() }

  async function save() {
    if (saving) return
    const parsed = ProcurementSupplierInputSchema.safeParse({ contact_email: email, company_name: company?.name, siren: company?.siren, city: company?.city })
    if (!parsed.success) { setError(parsed.error.issues[0].message); return }
    setSaving(true); setError(null)
    try {
      const response = await postJson(`/api/procurements/${procurementId}/suppliers`, parsed.data)
      if (response.status === 401) { router.push('/login'); return }
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Impossible d’ajouter le fournisseur. Veuillez réessayer.')
      const exists = suppliers.some((item) => item.contact_email === body.contact_email)
      onChange(exists ? suppliers.map((item) => item.contact_email === body.contact_email ? body : item) : [...suppliers, body])
      setMessage(exists ? 'Fournisseur mis à jour.' : 'Fournisseur ajouté.')
      setPanelOpen(false); setCompleting(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Impossible d’ajouter le fournisseur. Veuillez réessayer.')
    } finally { setSaving(false) }
  }

  async function remove(supplier: ProcurementSupplier) {
    if (removingId) return
    setRemovingId(supplier.id); setMessage(null)
    try {
      const response = await deleteRequest(`/api/procurements/${procurementId}/suppliers/${supplier.id}`)
      if (response.status === 401) { router.push('/login'); return }
      if (!response.ok) throw new Error()
      onChange(suppliers.filter((item) => item.id !== supplier.id))
      setMessage('Fournisseur retiré.')
    } catch {
      setMessage('Impossible de retirer le fournisseur. Veuillez réessayer.')
    } finally { setRemovingId(null) }
  }

  return <section id="suppliers" tabIndex={-1} aria-labelledby="procurement-suppliers-title" className="rounded-2xl border border-gray-200 bg-white scroll-mt-6 overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 sm:px-6">
      <div>
        <h2 id="procurement-suppliers-title" className="text-lg font-semibold text-gray-900">Fournisseurs</h2>
        <p className="mt-1 text-sm text-gray-600">{suppliers.length} entreprise{suppliers.length > 1 ? 's' : ''} consultée{suppliers.length > 1 ? 's' : ''}</p>
      </div>
      <button type="button" ref={addButton} onClick={() => panelOpen ? closePanel() : openPanel()} aria-expanded={panelOpen} aria-controls="supplier-panel" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#0080A3] bg-white px-4 font-medium text-[#0080A3] hover:bg-[#0080A3]/5 ${FOCUS_RING}`}><Plus size={18} aria-hidden="true" />Ajouter un fournisseur</button>
    </div>

    {message && <p role="status" className="mx-5 sm:mx-6 mb-4 text-sm text-gray-700">{message}</p>}

    {panelOpen && <div id="supplier-panel" className="mx-5 sm:mx-6 mb-5 rounded-xl border border-[#BFE3EE] bg-[#F5FAFC] p-4 sm:p-5">
      {completing && <p className="mb-3 text-sm font-semibold text-gray-900">Compléter le fournisseur {completing}</p>}
      <SupplierFields idPrefix="procurement-supplier" emailId="procurement-supplier-email" company={company} onCompanyChange={setCompany} email={email} onEmailChange={setEmail} onEmailKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save() } }} emailReadOnly={Boolean(completing)} disabled={saving} />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={closePanel} disabled={saving} className={`min-h-11 rounded-lg px-4 font-medium text-gray-600 hover:bg-white ${FOCUS_RING}`}>Annuler</button>
        <button type="button" onClick={() => void save()} disabled={saving} className={PRIMARY_BUTTON}>{saving ? 'Enregistrement…' : completing ? 'Enregistrer' : 'Ajouter'}</button>
      </div>
    </div>}

    {suppliers.length === 0 ? <p className="px-5 sm:px-6 pb-6 text-sm text-gray-600">Aucun fournisseur pour le moment.</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead><tr className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600"><th scope="col" className="px-6 py-2.5 font-semibold">Entreprise</th><th scope="col" className="px-3 py-2.5 font-semibold">Contact</th><th scope="col" className="px-3 py-2.5 font-semibold">Statut</th><th scope="col" className="px-6 py-2.5 w-12"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{suppliers.map((supplier) => <tr key={supplier.id} className="border-t border-gray-100">
          <td className="px-6 py-3.5">{supplier.company_name ? <><p className="font-semibold text-gray-900 break-words">{supplier.company_name}</p>{supplier.siren && <p className="mt-0.5 text-[13px] text-gray-600">SIREN {formatSiren(supplier.siren)}{supplier.city ? ` · ${supplier.city}` : ''}</p>}</> : <><p className="font-semibold text-gray-500">Entreprise non renseignée</p><p className="mt-0.5 text-[13px] text-gray-600">Ajouté avant cette version · <button type="button" onClick={() => openPanel(supplier.contact_email)} aria-label={`Compléter le fournisseur ${supplier.contact_email}`} className={`text-[#0080A3] hover:text-[#006280] hover:underline rounded ${FOCUS_RING}`}>Compléter</button></p></>}</td>
          <td className="px-3 py-3.5 text-gray-700 break-all">{supplier.contact_email}</td>
          <td className="px-3 py-3.5"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Non invité</span></td>
          <td className="px-6 py-2"><button type="button" onClick={() => void remove(supplier)} disabled={removingId === supplier.id} aria-label={`Retirer ${supplier.company_name ?? supplier.contact_email}`} className={`flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50 ${FOCUS_RING}`}><Trash2 size={18} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>
}
