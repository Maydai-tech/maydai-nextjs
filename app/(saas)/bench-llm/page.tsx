'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import BenchLLMPage from '@/components/BenchLLM/BenchLLMPage'

export default function BenchLLMPageRoute() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <BenchLLMPage />
}

