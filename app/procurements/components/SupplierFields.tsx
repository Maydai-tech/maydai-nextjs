'use client'
import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { useApiClient } from '@/lib/api-client'
import type { CompanySuggestion } from '@/lib/services/companySearch'
import { FOCUS_RING, INPUT_STYLE } from './form-ui'

export interface CompanySelection { name: string; siren: string | null; city: string | null }

interface Props {
  idPrefix: string
  emailId: string
  company: CompanySelection | null
  onCompanyChange: (company: CompanySelection | null) => void
  email: string
  onEmailChange: (email: string) => void
  onEmailKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  emailInputProps?: InputHTMLAttributes<HTMLInputElement>
  emailReadOnly?: boolean
  disabled?: boolean
}

export function formatSiren(siren: string) { return siren.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') }

// Entreprise (recherche Pappers ou saisie libre) + email du contact.
export default function SupplierFields({ idPrefix, emailId, company, onCompanyChange, email, onEmailChange, onEmailKeyDown, emailInputProps, emailReadOnly, disabled }: Props) {
  const [manual, setManual] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanySuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [searchError, setSearchError] = useState<string | null>(null)
  const requestId = useRef(0)
  const { get } = useApiClient()
  const listId = `${idPrefix}-company-results`

  useEffect(() => {
    if (manual || company || query.trim().length < 2) { setResults([]); return }
    const current = ++requestId.current
    const timer = setTimeout(async () => {
      try {
        const response = await get(`/api/company-search?q=${encodeURIComponent(query.trim())}`)
        const body = await response.json().catch(() => null)
        if (current !== requestId.current) return
        if (!response.ok) throw new Error(body?.error)
        setResults(body?.results ?? []); setActive(0); setOpen(true); setSearchError(null)
      } catch (failure) {
        if (current !== requestId.current) return
        setResults([]); setSearchError(failure instanceof Error && failure.message ? failure.message : 'La recherche d’entreprise est indisponible.')
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, manual, company, get])

  function pick(item: CompanySuggestion) {
    onCompanyChange({ name: item.name, siren: item.siren, city: item.city })
    setOpen(false); setQuery('')
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || !results.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (index + 1) % results.length) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index - 1 + results.length) % results.length) }
    else if (event.key === 'Enter') { event.preventDefault(); pick(results[active]) }
    else if (event.key === 'Escape') setOpen(false)
  }

  return <div className="flex flex-col lg:flex-row gap-4">
    <div className="flex-1 min-w-0">
      <label htmlFor={`${idPrefix}-company`} className="block text-sm font-medium text-gray-700 mb-2">{manual ? 'Nom de l’entreprise' : 'Entreprise'}</label>
      {company && !manual ? (
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[#0080A3]/40 bg-white pl-3">
          <span id={`${idPrefix}-company`} className="min-w-0 py-2 text-sm"><span className="font-semibold text-gray-900">{company.name}</span>{company.siren && <span className="text-gray-500"> · SIREN {formatSiren(company.siren)}{company.city ? ` · ${company.city}` : ''}</span>}</span>
          <button type="button" disabled={disabled} onClick={() => onCompanyChange(null)} aria-label={`Changer d’entreprise (${company.name})`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 ${FOCUS_RING}`}><X size={16} aria-hidden="true" /></button>
        </div>
      ) : manual ? (
        <input id={`${idPrefix}-company`} value={company?.name ?? ''} maxLength={200} disabled={disabled} onChange={(event) => onCompanyChange(event.target.value ? { name: event.target.value, siren: null, city: null } : null)} placeholder="Raison sociale" className={INPUT_STYLE} />
      ) : (
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-500" aria-hidden="true" />
          <input id={`${idPrefix}-company`} role="combobox" aria-expanded={open && results.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={open && results.length ? `${listId}-${active}` : undefined} value={query} disabled={disabled} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} onKeyDown={onSearchKeyDown} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Rechercher une entreprise" autoComplete="off" className={`${INPUT_STYLE} pl-10`} />
          {open && results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Entreprises trouvées" className="absolute z-20 mt-1.5 w-full rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
              {results.map((item, index) => (
                <li key={item.siren} id={`${listId}-${index}`} role="option" aria-selected={index === active} onMouseDown={(event) => { event.preventDefault(); pick(item) }} onMouseEnter={() => setActive(index)} className={`cursor-pointer rounded-lg px-3 py-2.5 ${index === active ? 'bg-[#F0F7FA]' : ''}`}>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-0.5 text-[13px] text-gray-600">SIREN {formatSiren(item.siren)}{item.postal_code || item.city ? ` · ${[item.postal_code, item.city].filter(Boolean).join(' ')}` : ''}{item.activity ? ` · ${item.activity}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-2 text-[13px] text-gray-600">
        {searchError && !manual ? <span className="text-amber-700">{searchError} </span> : manual ? null : 'Nom, SIREN ou SIRET · '}
        <button type="button" disabled={disabled} onClick={() => { setManual(!manual); onCompanyChange(null); setQuery(''); setSearchError(null) }} className={`text-[#0080A3] hover:text-[#006280] underline-offset-2 hover:underline rounded ${FOCUS_RING}`}>{manual ? 'Rechercher l’entreprise' : 'Saisir sans recherche'}</button>
      </p>
    </div>
    <div className="flex-1 min-w-0">
      <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-2">Email du contact</label>
      <input id={emailId} type="text" inputMode="email" autoComplete="off" value={email} readOnly={emailReadOnly} disabled={disabled} onChange={(event) => onEmailChange(event.target.value)} onKeyDown={onEmailKeyDown} placeholder="contact@fournisseur.fr" className={`${INPUT_STYLE} ${emailReadOnly ? 'bg-gray-50 text-gray-600' : ''}`} {...emailInputProps} />
    </div>
  </div>
}
