"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useApiCall } from '@/lib/api-auth'
import { Building2, ArrowLeft } from "lucide-react"

export default function NewCompanyPage() {
  const [name, setName] = useState("")
  const [industry, setIndustry] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const api = useApiCall()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await api.post('/api/companies', {
        name,
        industry,
        city,
        country,
      })
      if (result.data && result.data.id) {
        router.push(`/dashboard/${result.data.id}`)
      } else {
        setError("Erreur lors de la création de l'entreprise.")
      }
    } catch (err) {
      setError("Erreur lors de la création de l'entreprise.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8 sm:p-10">
        <div className="flex items-center mb-6">
          <Link href="/dashboard/companies" className="mr-3 text-gray-500 hover:text-[#0080A3]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="bg-[#0080A3]/10 p-3 rounded-lg">
            <Building2 className="h-6 w-6 text-[#0080A3]" />
          </div>
          <h1 className="ml-3 text-2xl font-bold text-gray-900">Créer une entreprise</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex : Maydai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              required
              placeholder="Ex : Technologie"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
                value={city}
                onChange={e => setCity(e.target.value)}
                required
                placeholder="Ex : Paris"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
                value={country}
                onChange={e => setCountry(e.target.value)}
                required
                placeholder="Ex : France"
              />
            </div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-[#0080A3] text-white font-semibold py-2 rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Création en cours..." : "Créer l'entreprise"}
          </button>
        </form>
      </div>
    </div>
  )
} 