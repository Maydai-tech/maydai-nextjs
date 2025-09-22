'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function TestSuccessPage() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setSessionId(searchParams.get('session_id'))
  }, [searchParams])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header de succès */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Test de Paiement Réussi !
          </h1>
          <p className="text-xl text-gray-600">
            L'intégration Stripe fonctionne correctement.
          </p>
        </div>

        {/* Détails de la session */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Détails de la session de test
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-600">Session ID</span>
              <span className="text-sm text-gray-500 font-mono">
                {sessionId || 'Non fourni'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-200">
              <span className="text-gray-600">Statut du test</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ✅ Succès
              </span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Redirection</span>
              <span className="text-gray-900">
                {sessionId ? 'Stripe Checkout → Page de succès' : 'Page de succès directe'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions de test */}
        <div className="text-center space-y-4">
          <button
            onClick={() => window.location.href = '/test-stripe'}
            className="bg-[#0080A3] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#006d8a] transition-colors inline-flex items-center"
          >
            Retour aux tests Stripe
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          
          <div className="text-sm text-gray-500">
            <p>Test d'intégration Stripe terminé avec succès !</p>
            <p>Vous pouvez maintenant implémenter cette intégration dans votre application principale.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
