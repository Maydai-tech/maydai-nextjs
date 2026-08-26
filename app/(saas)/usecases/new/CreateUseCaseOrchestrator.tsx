'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import { useCaseRoutes } from '@/app/(saas)/usecases/[id]/utils/routes'
import CreateUseCaseHub, {
  type CreationInteractionPath,
} from './components/CreateUseCaseHub'
import CreateUseCasePage from './CreateUseCasePage'

interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
}

function CreateUseCaseOrchestratorContent() {
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const api = useApiCall()
  const [mounted, setMounted] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [path, setPath] = useState<CreationInteractionPath | null>(null)

  const companyId = searchParams.get('company')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (user && mounted && companyId && session?.access_token) {
      fetchCompany()
    } else if (mounted && !companyId) {
      router.push('/dashboard/registries')
    }
  }, [user, mounted, companyId, session?.access_token])

  const fetchCompany = async () => {
    try {
      if (!session?.access_token || !companyId) return
      const response = await api.get(`/api/companies/${companyId}`)
      if (response.status === 404) {
        router.push('/dashboard/registries')
        return
      } else if (response.data) {
        setCompany(response.data)
      }
    } catch {
      router.push('/dashboard/registries')
    }
  }

  if (typeof window === 'undefined' || !mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement de l&apos;entreprise...</p>
        </div>
      </div>
    )
  }

  if (!path) {
    return (
      <CreateUseCaseHub
        companyName={company.name}
        dashboardHref={`/dashboard/${companyId}`}
        onSelect={(selected) => {
          if (selected === 'chat' && companyId) {
            router.push(useCaseRoutes.setupChat(companyId))
            return
          }
          setPath(selected)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setPath(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 transition hover:text-[#0080A3]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Choisir un autre type d&apos;interaction
        </button>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#0080A3]" />
              <p className="text-gray-600">Chargement du formulaire…</p>
            </div>
          </div>
        }
      >
        <CreateUseCasePage />
      </Suspense>
    </div>
  )
}

export default function CreateUseCaseOrchestrator() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <CreateUseCaseOrchestratorContent />
    </Suspense>
  )
}
