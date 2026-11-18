'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, MoreVertical, Plus, Search, Trash2 } from 'lucide-react'
import Toast from '@/components/Toast'
import { useApiClient } from '@/lib/api-client'
import { PROCUREMENT_PHASES, type Procurement } from '@/lib/validations/procurement'
import { groupByStatus, matchesSearch, PROCUREMENT_STATUS_LABELS, procurementStatus } from '@/lib/procurement-status'
import DeleteProcurementModal from './DeleteProcurementModal'

interface Props {
  initialProcurements: Procurement[]
  initialError: string | null
}

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus-visible:ring-offset-2'
const dayFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' })
const deadlineFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })

export default function ProcurementsSection({ initialProcurements, initialError }: Props) {
  const [procurements, setProcurements] = useState(initialProcurements)
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ id: string; message: string } | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  const creationNotified = useRef(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [procurementToDelete, setProcurementToDelete] = useState<Procurement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deletingRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuActionRef = useRef<HTMLButtonElement>(null)
  const actionButtons = useRef(new Map<string, HTMLButtonElement>())
  const focusAfterClose = useRef<string | null>(null)
  const pending = useRef(false)
  const { get, delete: deleteRequest } = useApiClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setProcurements(initialProcurements)
    setError(initialError)
  }, [initialProcurements, initialError])

  useEffect(() => {
    if (searchParams.get('procurementCreated') !== 'true') {
      creationNotified.current = false
      return
    }
    if (creationNotified.current) return
    creationNotified.current = true
    setToast({ id: 'created', message: 'L’appel d’offres a été créé avec succès.' })
    const params = new URLSearchParams(searchParams.toString())
    params.delete('procurementCreated')
    const query = params.toString()
    router.replace(`/dashboard/registries${query ? `?${query}` : ''}`, { scroll: false })
  }, [searchParams, router])

  useEffect(() => {
    if (!openMenuId) return
    menuActionRef.current?.focus()
    function closeOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [openMenuId])

  useEffect(() => {
    if (procurementToDelete || !focusAfterClose.current) return
    const target = focusAfterClose.current
    focusAfterClose.current = null
    if (target === 'heading') document.getElementById('procurements-heading')?.focus()
    else actionButtons.current.get(target)?.focus()
  }, [procurementToDelete])

  function closeDeleteModal() {
    if (deletingRef.current) return
    focusAfterClose.current = procurementToDelete?.id ?? null
    setProcurementToDelete(null)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!procurementToDelete || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    setDeleteError(null)
    try {
      const response = await deleteRequest(`/api/procurements/${procurementToDelete.id}`)
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) throw new Error('Suppression impossible')
      focusAfterClose.current = 'heading'
      setProcurements((current) => current.filter((item) => item.id !== procurementToDelete.id))
      setProcurementToDelete(null)
      setToast({ id: procurementToDelete.id, message: 'L’appel d’offres a été supprimé avec succès.' })
      router.refresh()
    } catch {
      setDeleteError('Impossible de supprimer l’appel d’offres. Veuillez réessayer.')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  async function retry() {
    if (pending.current) return
    pending.current = true
    setLoading(true)
    try {
      const response = await get('/api/procurements')
      if (response.status === 401) {
        router.push('/login')
        return
      }
      if (!response.ok) throw new Error('Chargement impossible')
      setProcurements(await response.json())
      setError(null)
    } catch {
      setError('Impossible de charger vos appels d’offres. Veuillez réessayer.')
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  const filtered = procurements.filter((item) => matchesSearch(search, item.title))
  const groups = groupByStatus(filtered)

  function renderCard(procurement: Procurement) {
    const status = procurementStatus(procurement.deadline_at)
    const closed = status === 'closed'
    const supplierCount = procurement.supplier_count ?? procurement.supplier_emails?.length ?? 0
    return (
      <li key={procurement.id} className="relative">
        <Link href={`/procurements/${procurement.id}`} className={`group block h-full bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:border-[#0080A3]/35 ${FOCUS_RING}`}>
          <span className="sr-only">{PROCUREMENT_STATUS_LABELS[status]} · </span>
          {procurement.phase && <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{PROCUREMENT_PHASES[procurement.phase]}</span>}
          <h5 className={`mt-3 pr-10 text-lg font-semibold break-words group-hover:text-[#006280] ${closed ? 'text-gray-700' : 'text-gray-900'}`}>{procurement.title}</h5>
          {procurement.description && <p className="mt-2 text-sm text-gray-600 line-clamp-2 whitespace-pre-line break-words">{procurement.description}</p>}
          <div className={`mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-1 text-sm ${closed ? 'text-gray-500' : 'text-gray-600'}`}>
            <span>{!procurement.deadline_at ? 'Date limite non renseignée' : closed ? `Clôturé le ${dayFormatter.format(new Date(procurement.deadline_at))}` : `Date limite : ${deadlineFormatter.format(new Date(procurement.deadline_at))}`}</span>
            <span>{supplierCount} fournisseur{supplierCount > 1 ? 's' : ''}</span>
          </div>
        </Link>
        <div className="absolute top-3 right-2.5" ref={openMenuId === procurement.id ? menuRef : undefined} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenuId(null) }}>
          <button type="button" ref={(button) => { if (button) actionButtons.current.set(procurement.id, button); else actionButtons.current.delete(procurement.id) }} onClick={() => setOpenMenuId((current) => current === procurement.id ? null : procurement.id)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpenMenuId(procurement.id) } }} aria-label={`Actions pour l’appel d’offres ${procurement.title}`} aria-expanded={openMenuId === procurement.id} aria-haspopup="menu" className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ${FOCUS_RING}`}>
            <MoreVertical size={20} aria-hidden="true" />
          </button>
          {openMenuId === procurement.id && (
            <div role="menu" aria-label={`Actions pour ${procurement.title}`} className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setOpenMenuId(null); actionButtons.current.get(procurement.id)?.focus() } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); menuActionRef.current?.focus() } }}>
              <button type="button" ref={menuActionRef} role="menuitem" onClick={() => { setOpenMenuId(null); setDeleteError(null); setProcurementToDelete(procurement) }} className={`w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded ${FOCUS_RING}`}>
                <Trash2 size={16} aria-hidden="true" /> Supprimer l’appel d’offres
              </button>
            </div>
          )}
        </div>
      </li>
    )
  }

  function renderGroup(label: string, items: Procurement[], tone: string) {
    if (!items.length) return null
    return (
      <div className="mt-7 first:mt-0">
        <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${tone}`}>{label} · {items.length}</h4>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderCard)}</ul>
      </div>
    )
  }

  return (
    <section aria-labelledby="procurements-heading" className="mt-12">
      <h2 id="procurements-heading" tabIndex={-1} className="text-2xl font-bold text-gray-900">Procurements</h2>
      <p className="mt-2 text-gray-600 max-w-prose">Préparez vos appels d’offres pour recueillir l’utilisation de l’IA de vos fournisseurs.</p>

      <div className="mt-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Mes appels d’offres</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {procurements.length > 0 && (
            <div className="relative sm:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <label htmlFor="procurement-search" className="sr-only">Rechercher un appel d’offres</label>
              <input id="procurement-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un appel d’offres" className="w-full min-h-11 rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0080A3]" />
            </div>
          )}
          <Link href="/procurements/new" className={`inline-flex shrink-0 min-h-11 items-center justify-center gap-2 bg-[#0080A3] hover:bg-[#006280] text-white px-4 py-2 rounded-lg font-medium transition-colors ${FOCUS_RING}`}>
            <Plus size={18} aria-hidden="true" />
            Créer un appel d’offres
          </Link>
        </div>
      </div>

      {toast && <Toast key={toast.id} message={toast.message} isVisible onClose={closeToast} duration={5000} />}

      {error ? (
        <div className="border border-red-200 bg-red-50 rounded-xl p-6" aria-busy={loading}>
          <p role="alert" className="text-red-800">{error}</p>
          <button type="button" onClick={() => void retry()} disabled={loading} className={`mt-3 px-3 py-2 rounded-md text-[#0080A3] font-medium hover:bg-white disabled:opacity-60 ${FOCUS_RING}`}>
            {loading ? 'Chargement…' : 'Réessayer'}
          </button>
        </div>
      ) : procurements.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-slate-50">
          <FileText size={40} className="text-gray-500 mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">Aucun appel d’offres pour le moment</h3>
          <p className="mt-2 text-sm text-gray-600 max-w-md">Créez votre premier appel d’offres en précisant son titre et votre besoin.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 text-center">
          <p className="font-semibold text-gray-900">Aucun appel d’offres ne correspond à « {search.trim()} »</p>
          <p className="mt-2 text-sm text-gray-600">Vérifiez l’orthographe ou <button type="button" onClick={() => setSearch('')} className={`text-[#0080A3] hover:text-[#006280] underline rounded ${FOCUS_RING}`}>effacez la recherche</button>.</p>
        </div>
      ) : (
        <div>
          {renderGroup('En cours', groups.open, 'text-[#006280]')}
          {renderGroup('Clôturés', groups.closed, 'text-gray-500')}
        </div>
      )}
      {procurementToDelete && <DeleteProcurementModal key={procurementToDelete.id} procurement={procurementToDelete} deleting={deleting} error={deleteError} onClose={closeDeleteModal} onConfirm={confirmDelete} />}
    </section>
  )
}
