"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useApiCall } from '@/lib/api-auth'
import { Building2, ArrowLeft } from "lucide-react"

export default function NewCompanyPage() {
  const [name, setName] = useState("")
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
      })
      if (result.data && result.data.id) {
        router.push(`/dashboard/${result.data.id}`)
      } else {
        setError("Erreur lors de la création du registre.")
      }
    } catch (err) {
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du registre</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0080A3]"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex : Acme"
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