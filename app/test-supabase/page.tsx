'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('🔍 Test de connexion Supabase...')
        
        // Test simple de connexion
        const { data: testData, error: testError } = await supabase
          .from('questionnaire_sections')
          .select('count')
          .limit(1)
        
        if (testError) {
          console.error('❌ Erreur Supabase:', testError)
          setConnectionStatus('❌ Erreur de connexion')
          setError(testError.message)
        } else {
          console.log('✅ Connexion Supabase réussie!')
          setConnectionStatus('✅ Connexion réussie')
          setData(testData)
        }
      } catch (err) {
        console.error('❌ Erreur de connexion:', err)
        setConnectionStatus('❌ Erreur de connexion')
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test de Connexion Supabase</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Status de Connexion</h2>
          <p className="text-lg">{connectionStatus}</p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 font-medium">Erreur:</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Variables d'Environnement</h2>
          <div className="space-y-2">
            <p>
              <strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Définie' : '❌ Non définie'}
            </p>
            <p>
              <strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Définie' : '❌ Non définie'}
            </p>
          </div>
        </div>

        {data && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Données Récupérées</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Ouvre la console développeur (F12)</li>
            <li>Regarde les logs de connexion Supabase</li>
            <li>Si il y a des erreurs, vérifie les variables d'environnement</li>
            <li>Si la connexion réussit, le GlobalLoader devrait se débloquer</li>
          </ol>
        </div>
      </div>
    </div>
  )
}



