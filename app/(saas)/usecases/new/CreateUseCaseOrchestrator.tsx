'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import ModeSelector from './components/ModeSelector'
import CreateUseCasePage from './CreateUseCasePage'
import GuidedChat from './components/GuidedChat/GuidedChat'
import type { CreationMode } from './types'

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
  const [mode, setMode] = useState<CreationMode>('form')

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

  return (
    <>
      <div className="bg-gray-50 pt-6 pb-2">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <ModeSelector mode={mode} onChange={setMode} />
        </div>
      </div>

      {mode === 'form' ? (
        <CreateUseCasePage />
      ) : (
        <div className="min-h-screen bg-gray-50 pt-4">
          <GuidedChat companyId={companyId!} company={company} />
        </div>
      )}
    </>
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
