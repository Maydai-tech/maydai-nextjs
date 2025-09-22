'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { CheckCircle, Download, ArrowRight, CreditCard, Calendar, User } from 'lucide-react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface PaymentDetails {
  id: string
  amount_total: number
  currency: string
  customer_email: string
  payment_status: string
  status: string
  subscription?: {
    id: string
    current_period_end: number
  }
}

export default function SuccessPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loadingPayment, setLoadingPayment] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  const sessionId = searchParams.get('session_id')

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Récupérer le profil utilisateur depuis Supabase
  useEffect(() => {
    if (!user || !mounted) return

    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Erreur lors de la récupération du profil:', error)
          return
        }

        setUserProfile(data)
      } catch (err) {
        console.error('Erreur:', err)
      }
    }

    fetchUserProfile()
  }, [user, mounted])

  // Récupérer les détails du paiement
  useEffect(() => {
    if (!sessionId || !mounted) return

    const fetchPaymentDetails = async () => {
      try {
        setLoadingPayment(true)
        const response = await fetch(`/api/stripe/retrieve-session?session_id=${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des détails du paiement')
        }

        const data = await response.json()
        setPaymentDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
        console.error('Erreur:', err)
      } finally {
        setLoadingPayment(false)
      }
    }

    fetchPaymentDetails()
  }, [sessionId, mounted])

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  // Show loading for payment details
  if (loadingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4"></div>
          <p className="text-gray-600">Récupération des détails du paiement...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Erreur</h2>
            <p className="text-red-600 mb-4">{error || 'Impossible de récupérer les détails du paiement'}</p>
            <button
              onClick={() => router.push('/abonnement')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retour aux abonnements
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isSubscription = paymentDetails.subscription !== undefined

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header de succès */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Paiement réussi !
          </h1>
          <p className="text-xl text-gray-600">
            Merci pour votre confiance. Votre abonnement MaydAI est maintenant actif.
          </p>
        </div>

        {/* Détails du paiement */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CreditCard className="w-6 h-6 text-[#0080A3] mr-3" />
            Détails du paiement
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Montant payé</span>
                <span className="text-xl font-semibold text-[#0080A3]">
                  {formatAmount(paymentDetails.amount_total, paymentDetails.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Statut</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {paymentDetails.payment_status === 'paid' ? 'Payé' : paymentDetails.payment_status}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Email</span>
                <span className="text-gray-900">{paymentDetails.customer_email}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-gray-600">Entreprise</span>
                <span className="text-gray-900 font-medium">
                  {userProfile?.company_name || 
                   userProfile?.company || 
                   (paymentDetails.customer_email ? 
                     paymentDetails.customer_email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                     'Non spécifiée')
                  }
                </span>
              </div>
              
              {isSubscription && paymentDetails.subscription && (
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-600">Prochaine facturation</span>
                  <span className="text-gray-900">
                    {formatDate(paymentDetails.subscription.current_period_end)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">Type</span>
                <span className="text-gray-900">
                  {isSubscription ? 'Abonnement récurrent' : 'Paiement unique'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions post-paiement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#0080A3]/10 rounded-lg flex items-center justify-center mr-4">
                <Download className="w-5 h-5 text-[#0080A3]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Télécharger la facture</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Conservez votre reçu pour vos comptes.
            </p>
            <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
              Télécharger PDF
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-[#0080A3]/10 rounded-lg flex items-center justify-center mr-4">
                <Calendar className="w-5 h-5 text-[#0080A3]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Gérer l'abonnement</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Modifiez ou annulez votre abonnement.
            </p>
            <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
              Gérer
            </button>
          </div>
        </div>

        {/* CTA principal */}
        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#0080A3] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#006d8a] transition-colors inline-flex items-center"
          >
            Accéder à mon dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Un email de confirmation a été envoyé à {paymentDetails.customer_email}</p>
          <p className="mt-2">
            Besoin d'aide ? Contactez notre support à{' '}
            <a href="mailto:support@maydai.io" className="text-[#0080A3] hover:underline">
              support@maydai.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
