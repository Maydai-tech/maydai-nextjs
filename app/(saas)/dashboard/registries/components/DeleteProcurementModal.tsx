'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { Procurement } from '@/lib/validations/procurement'

interface Props {
  procurement: Procurement
  deleting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'

export default function DeleteProcurementModal({ procurement, deleting, error, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [confirmationText, setConfirmationText] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deleting && confirmationText === procurement.title) void onConfirm()
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="delete-procurement-title" aria-describedby="delete-procurement-description" onCancel={(event) => { event.preventDefault(); if (!deleting) onClose() }} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="bg-red-50 p-2 rounded-lg shrink-0"><AlertTriangle size={24} className="text-red-600" aria-hidden="true" /></div>
          <div>
            <h3 id="delete-procurement-title" className="text-lg font-semibold text-gray-900">Supprimer l’appel d’offres</h3>
            <p id="delete-procurement-description" className="text-sm text-gray-600 mt-1">Cette action est irréversible.</p>
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={deleting} aria-label="Fermer la confirmation de suppression" className={`p-1 text-gray-500 hover:text-gray-700 rounded disabled:opacity-50 ${FOCUS_RING}`}><X size={20} aria-hidden="true" /></button>
      </div>
      <p className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-800 break-words">L’appel d’offres « {procurement.title} » sera supprimé définitivement.</p>
      <form onSubmit={submit} className="space-y-6" aria-busy={deleting}>
        <div>
          <label htmlFor="delete-procurement-confirmation" className="block text-sm font-medium text-gray-700 mb-2">Pour confirmer, saisissez le titre de l’appel d’offres : <span className="font-semibold text-gray-900 break-words">{procurement.title}</span></label>
          <input id="delete-procurement-confirmation" type="text" value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} disabled={deleting} autoComplete="off" placeholder="Saisissez le titre de l’appel d’offres" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100" />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button type="button" onClick={onClose} disabled={deleting} className={`px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 ${FOCUS_RING}`}>Annuler</button>
          <button type="submit" disabled={confirmationText !== procurement.title || deleting} className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}>{deleting ? 'Suppression en cours…' : 'Supprimer définitivement'}</button>
        </div>
      </form>
    </dialog>
  )
}
