'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Building2, FileText, GraduationCap, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PappersCompanySuggestionSchema } from '@/lib/validations/pappers'
import type { ProfileType } from '@/lib/validations/governance-scores'

const PappersSearchResponseSchema = z.object({
  results: z.array(PappersCompanySuggestionSchema),
})

export interface IndustryAutoSelectMapping {
  mainIndustryId: string
  subCategoryId: string
  annex_iii_sensitive: boolean
  annex_iii_domain: string | null
}

interface ProfileGovernanceFieldsProps {
  profileType: ProfileType
  onProfileTypeChange: (profileType: ProfileType) => void
  companyName: string
  onCompanyNameChange: (name: string) => void
  siren: string
  onSirenChange: (siren: string) => void
  nafCode: string
  onNafCodeChange: (naf: string) => void
  sirenVerifiedPappers: boolean
  onSirenVerifiedPappersChange: (verified: boolean) => void
  academicInstitution: string
  onAcademicInstitutionChange: (institution: string) => void
  academicDepartment: string
  onAcademicDepartmentChange: (department: string) => void
  onIndustryAutoSelect?: (mapping: IndustryAutoSelectMapping) => void
  disabled?: boolean
  idPrefix?: string
  highlightMissing?: boolean
}

const PROFILE_OPTIONS: Array<{ value: ProfileType; label: string }> = [
  { value: 'company', label: 'Entreprise / Association' },
  { value: 'advisor', label: 'Avocat / Cabinet de conseil' },
  { value: 'academic', label: 'Étudiant / Professeur / Chercheur' },
]

const INPUT_CLASS =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors'

export default function ProfileGovernanceFields({
  profileType,
  onProfileTypeChange,
  companyName,
  onCompanyNameChange,
  siren,
  onSirenChange,
  nafCode,
  onNafCodeChange,
  sirenVerifiedPappers,
  onSirenVerifiedPappersChange,
  academicInstitution,
  onAcademicInstitutionChange,
  academicDepartment,
  onAcademicDepartmentChange,
  onIndustryAutoSelect,
  disabled = false,
  idPrefix = '',
  highlightMissing = false,
}: ProfileGovernanceFieldsProps) {
  const { getAccessToken } = useAuth()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<z.infer<typeof PappersCompanySuggestionSchema>[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [annexNotice, setAnnexNotice] = useState<string | null>(null)

  useEffect(() => {
    if (profileType === 'academic') {
      setSuggestions([])
      setSearching(false)
      return
    }

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError('')
      try {
        const token = getAccessToken()
        const response = await fetch(`/api/pappers/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'same-origin',
        })
        if (!response.ok) {
          throw new Error('Recherche Pappers indisponible')
        }
        const payload = PappersSearchResponseSchema.safeParse(await response.json())
        if (!payload.success) {
          console.error('[ProfileGovernanceFields] recherche Pappers', payload.error)
          throw new Error('Réponse Pappers invalide')
        }
        setSuggestions(payload.data.results)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('[ProfileGovernanceFields] recherche Pappers', error)
        setSuggestions([])
        setSearchError('Impossible de rechercher la structure pour le moment.')
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [getAccessToken, profileType, query])

  const missingRing = (isEmpty: boolean) =>
    highlightMissing && isEmpty ? 'ring-2 ring-[#ffab5a] border-transparent' : ''

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          Type de profil <span className="text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-1 gap-2">
          {PROFILE_OPTIONS.map((option) => {
            const selected = profileType === option.value
            return (
              <label
                key={option.value}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  selected
                    ? 'border-[#0080A3] bg-[#0080A3]/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`${idPrefix}profileType`}
                  value={option.value}
                  checked={selected}
                  onChange={() => onProfileTypeChange(option.value)}
                  className="h-4 w-4 text-[#0080A3] focus:ring-[#0080A3]"
                />
                <span className="text-sm text-gray-900">{option.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {profileType === 'academic' ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-[#0080A3]/20 bg-[#0080A3]/5 p-3 text-sm text-[#006280]">
            Mode Académique / Pédagogique : votre rapport PDF portera la mention Usage Académique / Pédagogique.
          </div>
          <div>
            <label htmlFor={`${idPrefix}academicInstitution`} className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l&apos;établissement (Université / École) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <GraduationCap className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id={`${idPrefix}academicInstitution`}
                type="text"
                required
                disabled={disabled}
                value={academicInstitution}
                data-missing={!academicInstitution.trim() ? 'true' : 'false'}
                onChange={(event) => {
                  const next = event.target.value
                  onAcademicInstitutionChange(next)
                  if (!companyName.trim() || companyName === academicInstitution) {
                    onCompanyNameChange(next)
                  }
                }}
                className={`${INPUT_CLASS} pl-10 ${missingRing(!academicInstitution.trim())}`}
                placeholder="Université, école ou institut"
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idPrefix}academicDepartment`} className="block text-sm font-medium text-gray-700 mb-2">
              Promotion / Classe / Laboratoire <span className="text-red-500">*</span>
            </label>
            <input
              id={`${idPrefix}academicDepartment`}
              type="text"
              required
              disabled={disabled}
              value={academicDepartment}
              data-missing={!academicDepartment.trim() ? 'true' : 'false'}
              onChange={(event) => onAcademicDepartmentChange(event.target.value)}
              className={`${INPUT_CLASS} ${missingRing(!academicDepartment.trim())}`}
              placeholder="Master 2, laboratoire, promotion"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor={`${idPrefix}pappers-search`} className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher votre structure (API Pappers - Nom d&apos;entreprise)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id={`${idPrefix}pappers-search`}
                type="search"
                disabled={disabled}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${INPUT_CLASS} pl-10`}
                placeholder="Nom de l'entreprise"
                autoComplete="off"
              />
            </div>
            {searching ? <p className="mt-1 text-xs text-gray-500">Recherche en cours…</p> : null}
            {searchError ? <p className="mt-1 text-sm text-red-600">{searchError}</p> : null}
            {suggestions.length > 0 ? (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {suggestions.map((item) => (
                  <li key={`${item.siren}-${item.nom_entreprise}`}>
                    <button
                      type="button"
                      disabled={disabled}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => {
                        onCompanyNameChange(item.nom_entreprise)
                        onSirenChange(item.siren)
                        onNafCodeChange(item.code_naf || '')
                        onSirenVerifiedPappersChange(true)
                        if (item.suggested_industry && onIndustryAutoSelect) {
                          onIndustryAutoSelect(item.suggested_industry)
                          setAnnexNotice(
                            item.suggested_industry.annex_iii_sensitive
                              ? `Secteur identifié Annexe III AI Act : ${item.suggested_industry.annex_iii_domain ?? item.suggested_industry.subCategoryId}`
                              : null
                          )
                        } else {
                          setAnnexNotice(null)
                        }
                        setQuery(item.nom_entreprise)
                        setSuggestions([])
                      }}
                    >
                      <span className="block text-sm font-medium text-gray-900">{item.nom_entreprise}</span>
                      <span className="block text-xs text-gray-500">
                        SIREN {item.siren}
                        {item.code_naf ? ` · NAF ${item.code_naf}` : ''}
                        {item.ville ? ` · ${item.ville}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {annexNotice ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {annexNotice}
            </div>
          ) : null}

          <div>
            <label htmlFor={`${idPrefix}companyName`} className="block text-sm font-medium text-gray-700 mb-2">
              Entreprise <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id={`${idPrefix}companyName`}
                name="companyName"
                type="text"
                required
                disabled={disabled}
                value={companyName}
                data-missing={!companyName.trim() ? 'true' : 'false'}
                onChange={(event) => onCompanyNameChange(event.target.value)}
                className={`${INPUT_CLASS} pl-10 ${missingRing(!companyName.trim())}`}
                placeholder="Nom de votre entreprise"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${idPrefix}siren`} className="block text-sm font-medium text-gray-700 mb-2">
              SIREN <span className="text-gray-500 text-xs">(optionnel)</span>
              {sirenVerifiedPappers ? (
                <span className="ml-2 text-xs font-medium text-green-700">Vérifié Pappers</span>
              ) : null}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id={`${idPrefix}siren`}
                name="siren"
                type="text"
                inputMode="numeric"
                maxLength={9}
                disabled={disabled}
                value={siren}
                data-missing={!siren ? 'true' : 'false'}
                onChange={(event) => {
                  onSirenChange(event.target.value.replace(/\D/g, '').slice(0, 9))
                  onSirenVerifiedPappersChange(false)
                }}
                className={`${INPUT_CLASS} pl-10`}
                placeholder="123456789"
              />
            </div>
          </div>

          {nafCode ? (
            <p className="text-xs text-gray-500">Code NAF retenu : {nafCode}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
