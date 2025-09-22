'use client'

import { useState } from 'react'
import { useStripe } from '@/hooks/useStripe'

// Plans de test simplifiés
const testPlans = [
  {
    id: 'starter',
    name: 'Test Gratuit',
    description: 'Plan de test gratuit',
    price: { monthly: 0, yearly: 0 },
    stripePriceId: { 
      monthly: 'price_1S8JY316FiJU1KS5V9k250i7',
      yearly: 'price_1S8JY316FiJU1KS5V9k250i7'
    },
    free: true
  },
  {
    id: 'pro',
    name: 'Test Pro',
    description: 'Plan de test Pro - 10€/mois',
    price: { monthly: 10, yearly: 100 },
    stripePriceId: { 
      monthly: 'price_1S8JkN16FiJU1KS5MjGTdcIo',
      yearly: 'price_1S8JkN16FiJU1KS5L9MBToBM'
    },
    free: false
  },
  {
    id: 'enterprise',
    name: 'Test Enterprise',
    description: 'Plan de test Enterprise - 1000€/mois',
    price: { monthly: 1000, yearly: 10000 },
    stripePriceId: { 
      monthly: 'price_1S8IL716FiJU1KS5cpmO81Ct',
      yearly: 'price_1S8IL716FiJU1KS5cpmO81Ct'
    },
    free: false
  }
]

export default function TestStripePage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const { createCheckoutSession, loading, error } = useStripe()

  const handlePayment = async (plan: any) => {
    if (plan.free) {
      alert('Plan gratuit - pas de paiement nécessaire')
      return
    }
    
    const priceId = plan.stripePriceId[billingCycle]
    const mode = 'subscription'
    
    try {
      await createCheckoutSession(priceId, mode)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Test Intégration Stripe
          </h1>
          <p className="text-xl text-gray-600">
            Page de test pour vérifier le fonctionnement de Stripe
          </p>
        </div>

        {/* Toggle Billing */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-[#0080A3] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-[#0080A3] text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annuel
            </button>
          </div>
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erreur Stripe
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans de test */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8 hover:shadow-lg transition-shadow"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  {plan.free ? (
                    <span className="text-4xl font-bold text-[#0080A3]">0€</span>
                  ) : (
                    <span className="text-4xl font-bold text-[#0080A3]">
                      {billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly}€
                    </span>
                  )}
                  <span className="text-gray-500 ml-2">
                    /{billingCycle === 'yearly' ? 'an' : 'mois'}
                  </span>
                </div>

                <button
                  onClick={() => handlePayment(plan)}
                  disabled={loading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                    plan.free
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-[#0080A3] text-white hover:bg-[#006d8a]'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Chargement...' : 
                   plan.free ? 'Test Gratuit' : 
                   'Tester le Paiement'}
                </button>
              </div>

              {/* Détails techniques */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Détails techniques :
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Price ID:</strong> {plan.stripePriceId[billingCycle]}</p>
                  <p><strong>Mode:</strong> {plan.free ? 'N/A' : 'subscription'}</p>
                  <p><strong>Cycle:</strong> {billingCycle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions de test */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Instructions de test
            </h3>
            <div className="text-blue-800 space-y-2">
              <p><strong>1. Test du plan gratuit :</strong> Cliquez sur "Test Gratuit" - aucun paiement ne doit être déclenché</p>
              <p><strong>2. Test des plans payants :</strong> Cliquez sur "Tester le Paiement" - vous devez être redirigé vers Stripe Checkout</p>
              <p><strong>3. Données de test Stripe :</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• Email : test@example.com</li>
                <li>• Carte : 4242 4242 4242 4242</li>
                <li>• Date : 12/34</li>
                <li>• CVC : 123</li>
              </ul>
              <p><strong>4. Vérification :</strong> Après paiement, vous devez être redirigé vers /success</p>
            </div>
          </div>
        </div>

        {/* Informations de debug */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Informations de debug :
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Clé publique Stripe :</strong> {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✅ Configurée' : '❌ Manquante'}</p>
              <p><strong>URL de l'app :</strong> {process.env.NEXT_PUBLIC_APP_URL || 'Non définie'}</p>
              <p><strong>Cycle sélectionné :</strong> {billingCycle}</p>
              <p><strong>État du chargement :</strong> {loading ? 'Chargement...' : 'Prêt'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
