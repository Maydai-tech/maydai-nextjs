'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Shield,
  BarChart3,
  Download,
  Bell
} from 'lucide-react'
import Image from 'next/image'
import PlanCard from '@/components/Subscriptions/PlanCard'
import CurrentPlanStatus from '@/components/Subscriptions/CurrentPlanStatus'
import BillingToggle from '@/components/Subscriptions/BillingToggle'
import { useStripe } from '@/app/abonnement/hooks/useStripe'
import { useSubscription } from '@/app/abonnement/hooks/useSubscription'
import { getPlans } from '@/lib/stripe/config/plans'
import type { MaydAIPlan } from '@/lib/stripe/types'
import SuccessPaymentPopup from '@/components/Subscriptions/SuccessPaymentPopup'
import { getPlanInfo, getDefaultPlan } from '@/lib/subscription/plans'
import { formatBillingCycle, formatNextBillingDate, calculateNextBillingAmount } from '@/lib/subscription/utils'

interface SubscriptionPageProps {
  showSuccessPopup?: boolean
  onCloseSuccessPopup?: () => void
}

export default function SubscriptionPage({
  showSuccessPopup: externalShowSuccessPopup,
  onCloseSuccessPopup
}: SubscriptionPageProps = {}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('starter') // starter, pro, enterprise
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly') // monthly, yearly
  const { createCheckoutSession, error: stripeError } = useStripe()
  const { subscription, loading: subscriptionLoading, error: subscriptionError, cancelSubscription, refreshSubscription } = useSubscription()
  const [localShowSuccessPopup, setLocalShowSuccessPopup] = useState(false)

  // Récupérer les plans depuis la configuration centralisée
  const plans: MaydAIPlan[] = getPlans()

  // Calculer les données d'affichage basées sur l'abonnement réel
  const currentPlanInfo = subscription
    ? getPlanInfo(subscription.plan_id)
    : getDefaultPlan()

  const currentBillingCycle = subscription
    ? formatBillingCycle(subscription.plan_id)
    : billingCycle

  const nextBillingDate = formatNextBillingDate(subscription?.current_period_end || null)
  const nextBillingAmount = calculateNextBillingAmount(
    subscription?.plan_id || 'starter',
    currentBillingCycle
  )

  // Utiliser le state externe si fourni, sinon le state local
  const showSuccessPopup = externalShowSuccessPopup ?? localShowSuccessPopup

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  // Show loading state during SSR and initial client load
  if (!mounted || loading || subscriptionLoading) {
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



  const handleBillingToggle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')
  }

  const handlePayment = async (plan: MaydAIPlan) => {
    if (plan.free) {
      // Pour le plan gratuit, on peut directement activer
      setCurrentPlan(plan.id)
      setLocalShowSuccessPopup(true)
      return
    }

    const priceId = plan.stripePriceId[currentBillingCycle]
    const mode = plan.custom ? 'payment' : 'subscription'

    try {
      await createCheckoutSession(priceId, mode, user?.id)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription()
      // Le hook se charge de rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error)
      // Ici on pourrait afficher une notification d'erreur
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header avec design moderne */}
        <div className="mb-10">
          <div className="bg-white/70 backdrop-blur-sm border border-gray-100 rounded-xl p-8 shadow-sm">
            <div className="flex flex-col items-center mb-6">
              <Image src="/icons/tag.png" alt="Étiquette de prix" width={64} height={64} className="w-16 h-16 mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Abonnements MaydAI
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Trouvez le plan adapté à votre situation : audit IA gratuit pour démarrer ou tester une idée de cas d'usage IA, un abonnement mensuel pour les organisations plus complexes ou un devis sur mesure pour intégrer dès à présent l'IA Act dans votre entreprise.
            </p>
          </div>
        </div>

        {/* Affichage des erreurs Stripe et abonnement */}
        {(stripeError || subscriptionError) && (
          <div className="mb-8">
            <div className="bg-red-50/70 backdrop-blur-sm border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {subscriptionError ? 'Erreur d\'abonnement' : 'Erreur de paiement'}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{subscriptionError || stripeError}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Status */}
        <div className="mb-12">
          <CurrentPlanStatus
            planName={currentPlanInfo.displayName}
            billingCycle={currentBillingCycle}
            nextBillingDate={nextBillingDate}
            nextBillingAmount={nextBillingAmount}
            onCancelSuccess={refreshSubscription}
            isFreePlan={currentPlanInfo.isFree}
            cancelAtPeriodEnd={subscription?.cancel_at_period_end || false}
          />
        </div>

        {/* Plans Grid */}
        {(!subscription || currentPlanInfo.isFree) && (
          <div className="mb-12">
              {/* Billing Toggle */}
              <div className="mb-8">
                <BillingToggle
                  billingCycle={currentBillingCycle}
                  onToggle={handleBillingToggle}
                />
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billingCycle={currentBillingCycle}
                  isCurrentPlan={currentPlanInfo.id === plan.id}
                  onPayment={handlePayment}
                />
              ))}
            </div>

            {/* Notes additionnelles sous les cartes */}
            <div className="text-center mt-12 text-gray-500 text-sm max-w-2xl mx-auto">
              <p>Tout abonnement peut être arrêté à tout moment.</p>
              <p>Les audits IA Act gratuits sont protégés et ne sont pas utilisés à des fins d'entraînement (ce qui est hélas le cas aujourd'hui de l'IA gratuite).</p>
            </div>
          </div>
        )}
       
      </div>

      {showSuccessPopup && (
        <SuccessPaymentPopup
          onClose={onCloseSuccessPopup || (() => setLocalShowSuccessPopup(false))}
        />
      )}
    </div>
  )
}