'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestStripeSyncPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<string>('Vérification...')

  useEffect(() => {
    async function checkStripeSync() {
      try {
        console.log('🔍 Vérification de la synchronisation Stripe-Supabase...')
        
        // 1. Vérifier la table subscriptions
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (subscriptionError) {
          console.error('❌ Erreur table subscriptions:', subscriptionError)
          setError(`Erreur table subscriptions: ${subscriptionError.message}`)
        } else {
          console.log('✅ Table subscriptions accessible:', subscriptionData?.length || 0, 'enregistrements')
          setSubscriptions(subscriptionData || [])
        }

        // 2. Vérifier les variables d'environnement
        const envCheck = {
          stripeSecretKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Configurée' : '❌ Manquante',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Non définie',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurée' : '❌ Manquante',
        }
        
        console.log('🔧 Variables d\'environnement:', envCheck)
        
        // 3. Tester l'endpoint webhook
        try {
          const response = await fetch('/api/stripe/webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ test: true })
          })
          
          if (response.ok) {
            setWebhookStatus('✅ Endpoint webhook accessible')
          } else {
            setWebhookStatus(`❌ Erreur webhook: ${response.status}`)
          }
        } catch (webhookError) {
          setWebhookStatus(`❌ Erreur webhook: ${webhookError}`)
        }
        
      } catch (err) {
        console.error('❌ Erreur de vérification:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    checkStripeSync()
  }, [])

  const testWebhook = async () => {
    try {
      console.log('🧪 Test de création de subscription...')
      
      const response = await fetch('/api/test-stripe-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log('✅ Test subscription créée:', result.data)
        // Recharger les données
        window.location.reload()
      } else {
        console.error('❌ Test subscription échoué:', result.error)
        setError(result.error)
      }
    } catch (err) {
      console.error('❌ Erreur test subscription:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Synchronisation Stripe-Supabase</h1>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test Synchronisation Stripe-Supabase</h1>
      
      <div className="space-y-6">
        {/* Status général */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Status de Synchronisation</h2>
          <div className="space-y-2">
            <p><strong>Table subscriptions :</strong> {subscriptions.length} enregistrements</p>
            <p><strong>Webhook :</strong> {webhookStatus}</p>
            <p><strong>URL App :</strong> {process.env.NEXT_PUBLIC_APP_URL || 'Non définie'}</p>
          </div>
        </div>

        {/* Variables d'environnement */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Variables d'Environnement</h2>
          <div className="space-y-2">
            <p>
              <strong>Clé publique Stripe :</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Configurée' : '❌ Manquante'}
            </p>
            <p>
              <strong>URL Supabase :</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurée' : '❌ Manquante'}
            </p>
          </div>
        </div>

        {/* Données subscriptions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Données Subscriptions ({subscriptions.length})</h2>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucune donnée trouvée dans la table subscriptions</p>
            <button 
              onClick={testWebhook}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Créer Subscription de Test
            </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">User ID</th>
                    <th className="px-4 py-2 text-left">Stripe Subscription ID</th>
                    <th className="px-4 py-2 text-left">Plan ID</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b">
                      <td className="px-4 py-2 text-sm">{sub.id}</td>
                      <td className="px-4 py-2 text-sm">{sub.user_id}</td>
                      <td className="px-4 py-2 text-sm">{sub.stripe_subscription_id}</td>
                      <td className="px-4 py-2 text-sm">{sub.plan_id}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{new Date(sub.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions de test */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Actions de Test</h2>
          <div className="space-y-4">
            <button 
              onClick={testWebhook}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-4"
            >
              Créer Subscription de Test
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Actualiser les Données
            </button>
          </div>
        </div>

        {/* Erreurs */}
        {error && (
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Erreurs</h2>
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
