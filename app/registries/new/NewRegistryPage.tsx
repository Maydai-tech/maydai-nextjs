"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useApiCall } from '@/lib/api-client-legacy'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'
import { Building2, ArrowLeft } from "lucide-react"
import { REGISTRY_TYPES } from '@/lib/registry-types'
import { trackRegistryCreation, type PlanName } from '@/lib/gtm'
import CompanySectorSelector, { type IndustrySelection } from '@/components/CompanySectorSelector'

export default function NewRegistryPage() {
  const [name, setName] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [customType, setCustomType] = useState("")
  const [industrySelection, setIndustrySelection] = useState<IndustrySelection>({
    mainIndustryId: '',
    subCategoryId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingRegistryCount, setExistingRegistryCount] = useState<number | null>(null)
  const router = useRouter()
  const api = useApiCall()
  const { plan } = useUserPlan()

  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      try {
        const result = await api.get('/api/companies')
        if (!cancelled && result.data) {
          const owned = result.data.filter(
            (c: { role: string }) => c.role === 'owner' || c.role === 'company_owner'
          )
          setExistingRegistryCount(owned.length)
        }
      } catch {
        if (!cancelled) setExistingRegistryCount(0)
      }
    }
    void fetchCount()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const typeValue = selectedType === 'autre' ? customType : selectedType
      const hasIndustry =
        Boolean(industrySelection.mainIndustryId?.trim()) &&
        Boolean(industrySelection.subCategoryId?.trim())

      const result = await api.post('/api/companies', {
        name,
        type: typeValue || undefined,
        ...(hasIndustry
          ? {
              mainIndustryId: industrySelection.mainIndustryId.trim(),
              subCategoryId: industrySelection.subCategoryId.trim(),
            }
          : {}),
      })
      if (result.data && result.data.id) {
        const planName = (plan.name || 'freemium') as PlanName
        const registryType = selectedType === 'autre' ? 'autre' : (selectedType || 'non_specifie')
        const isFirst = existingRegistryCount === 0

        trackRegistryCreation(registryType, planName, isFirst)

        router.push(`/dashboard/${result.data.id}`)
      } else {
        setError("Erreur lors de la création du registre.")
      }
    } catch {
      setError("Erreur lors de la création du registre.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 sm:p-10">
        <div className="flex items-center mb-6">
          <Link href="/dashboard/registries" className="mr-3 text-gray-500 hover:text-[#0080A3]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="bg-[#0080A3]/10 p-3 rounded-lg">
            <Building2 className="h-6 w-6 text-[#0080A3]" />
          </div>
          <h1 className="ml-3 text-2xl font-bold text-gray-900">Créer un registre</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du registre *</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex : Acme"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de registre</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3] bg-white"
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value)
                if (e.target.value !== 'autre') {
                  setCustomType("")
                }
              }}
            >
              <option value="">Sélectionner un type</option>
              {REGISTRY_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
              <option value="autre">Autre</option>
            </select>
          </div>

          {selectedType === 'autre' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Précisez le type</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="Ex : Direction RH, Département IT..."
              />
            </div>
          )}

          <div>
            <CompanySectorSelector
              value={industrySelection}
              onChange={setIndustrySelection}
              // Optional on registry creation: API fallback will apply if omitted.
              required={false}
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-[#0080A3] text-white font-semibold py-2 rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Création en cours..." : "Créer le registre"}
          </button>
        </form>
      </div>
    </div>
  )
}
