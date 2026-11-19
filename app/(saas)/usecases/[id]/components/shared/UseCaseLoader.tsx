import React from 'react'

interface UseCaseLoaderProps {
  message?: string
}

export function UseCaseLoader({ message = "Chargement..." }: UseCaseLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
} 