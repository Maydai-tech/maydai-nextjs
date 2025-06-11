'use client'

import { Suspense } from 'react'

// Force dynamic rendering for all usecases pages
export const dynamic = 'force-dynamic'

export default function UseCasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  )
} 