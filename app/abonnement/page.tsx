'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { 
  Shield, 
  BarChart3,
  Download,
  Bell,
  ArrowRight
} from 'lucide-react'
import Image from 'next/image'
import PlanCard from '@/components/PlanCard'
import CurrentPlanStatus from '@/components/CurrentPlanStatus'
import BillingToggle from '@/components/BillingToggle'
import { useStripe } from '@/hooks/useStripe'

export default function AbonnementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('starter') // starter, pro, enterprise
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly') // monthly, yearly
  const { createCheckoutSession, loading: stripeLoading, error: stripeError } = useStripe()

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

  const plans = [
    {
      id: 'starter',
      name: 'La Mise en Bouche',
      description: 'Vous souhaitez agir tout de suite, vous mettre en conformité ou tester des projets IA.',
      price: { monthly: 0, yearly: 0 },
      stripePriceId: { 
        monthly: 'price_1SA8wX1ALRgJSDBxK8g4bH8q', // Gratuit (PRICE ID)
        yearly: 'price_1SA8wX1ALRgJSDBxK8g4bH8q'   // Gratuit (PRICE ID)
      },
      icon: 'level-up.png',
      color: 'blue',
      features: [
        '1 registre IA Act',
        '1 Dashboard Entreprise',
        "6 cas d'usage IA disponibles",
        "6 modèles de cas d'usage disponibles",
        '3 invitations pour collaborer',
        'Support Email'
      ],
      limitations: [],
      free: true
    },
    {
      id: 'pro',
      name: 'Le Lève-tôt',
      description: "Vous avez la volonté de centraliser et d'évaluer tous les cas d'usages de votre entreprise et/ou de ses filiales.",
      price: { monthly: 10, yearly: 100 },
      stripePriceId: { 
        monthly: 'price_1SA8t21ALRgJSDBxFaYrH1d7', // 10€/mois (PRICE ID)
        yearly: 'price_1SA8v81ALRgJSDBx0CDPDcid'   // 100€/an (PRICE ID)
      },
      icon: 'le-coucher-du-soleil.png',
      color: 'purple',
      features: [
        '1 super registre IA Act',
        '3 registres IA Act',
        '4 Dashboards Entreprise',
        "12 cas d'usage IA disponibles",
        "12 modèles de cas d'usage disponibles",
        '6 invitations pour collaborer',
        'Support prioritaire'
      ],
      limitations: [],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Le Pilote',
      description: "Devis entreprise: Vous avez besoin d'être accompagné en matière de formation, de création d'audit IA act et de registre entreprise.",
      price: { monthly: 1000, yearly: 10000 },
      stripePriceId: { 
        monthly: 'price_1SA8xx1ALRgJSDBxUrh2lJwg', // 1000€/mois (PRICE ID)
        yearly: 'price_1SA8xx1ALRgJSDBxUrh2lJwg'   // 1000€/mois (PRICE ID)
      },
      icon: 'chapeau-de-pilote.png',
      color: 'gold',
      features: [
        '1 formation sur site',
        '1 atelier audit IA act',
        'Création du Dashboard Entreprise',
        "Cas d'usage IA illimités",
        'Collaboration illimitée',
        "Support juridique relecture cas d'usage",
        'Support prioritaire'
      ],
      limitations: [],
      custom: true
    }
  ]

  const handlePlanSelect = (planId: string) => {
    setCurrentPlan(planId)
  }

  const handleBillingToggle = () => {
    setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')
  }

  const handlePayment = async (plan: any) => {
    if (plan.free) {
      // Pour le plan gratuit, on peut directement activer
      setCurrentPlan(plan.id)
      return
    }
    
    const priceId = plan.stripePriceId[billingCycle]
    const mode = plan.custom ? 'payment' : 'subscription'
    
    try {
      await createCheckoutSession(priceId, mode)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
    }
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto">
          <div className="flex flex-col items-center mb-6">
            <Image src="/icons/tag.png" alt="Étiquette de prix" width={64} height={64} className="w-16 h-16 mb-4" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: '#0080a3' }}>
              Abonnements MaydAI
            </h1>
          </div>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Trouvez le plan adapté à votre situation : audit IA gratuit pour démarrer ou tester une idée de cas d'usage IA, un abonnement mensuel pour les organisations plus complexes ou un devis sur mesure pour intégrer dès à présent l'IA Act dans votre entreprise.
          </p>
          
          {/* Billing Toggle */}
          <div className="mb-8">
            <BillingToggle 
              billingCycle={billingCycle} 
              onToggle={handleBillingToggle} 
            />
          </div>
        </div>

      {/* Affichage des erreurs Stripe */}
      {stripeError && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de paiement
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{stripeError}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}      </section>

      {/* Current Plan Status */}
      <CurrentPlanStatus
        planName="La Mise en Bouche"
        billingCycle={billingCycle}
        nextBillingDate="Gratuit"
        nextBillingAmount={0}
        onManage={() => console.log('Gérer l\'abonnement')}
      />

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                isCurrentPlan={currentPlan === plan.id}
                onSelect={handlePlanSelect}
                onPayment={handlePayment}
              />
            ))}          </div>
          
          {/* Notes additionnelles sous les cartes */}
          <div className="text-center mt-12 text-gray-500 text-sm max-w-2xl mx-auto">
            <p>Tout abonnement peut être arrêté à tout moment.</p>
            <p>Les audits IA Act gratuits sont protégés et ne sont pas utilisés à des fins d'entraînement (ce qui est hélas le cas aujourd'hui de l'IA gratuite).</p>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <div className="bg-gray-50 rounded-2xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Fonctionnalités incluses dans tous les plans
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-[#0080A3]/10 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-[#0080A3]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Conformité IA Act</h3>
            <p className="text-sm text-gray-600">Audit complet selon les réglementations européennes</p>
          </div>
          
          <div className="text-center">
            <div className="bg-[#0080A3]/10 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-[#0080A3]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Rapports détaillés</h3>
            <p className="text-sm text-gray-600">Analyses approfondies avec recommandations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-[#0080A3]/10 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bell className="h-8 w-8 text-[#0080A3]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Alertes automatiques</h3>
            <p className="text-sm text-gray-600">Notifications des changements réglementaires</p>
          </div>
          
          <div className="text-center">
            <div className="bg-[#0080A3]/10 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Download className="h-8 w-8 text-[#0080A3]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Export PDF</h3>
            <p className="text-sm text-gray-600">Téléchargement des rapports en PDF</p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex flex-col items-center mb-4">
              <Image src="/icons/chats.png" alt="Chat" width={64} height={64} className="w-16 h-16 mb-4" />
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#0080a3]">
                FAQ MaydAI
              </h2>
            </div>
            <p className="mt-3 text-lg text-gray-600">
              La Boussole Éthique pour l'Ère Numérique
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg">
              <button className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-100">
                <span>Puis-je changer de plan à tout moment sans me perdre dans les méandres bureaucratiques ?</span>
                <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
              <div className="p-5 pt-0 text-gray-600">
                <p>Absolument ! Chez MaydAI, nous croyons en la liberté de mouvement. Vous pouvez upgrader ou downgrader votre plan à tout moment, comme changer de chaussures selon la météo. Les changements prennent effet immédiatement, sans paperasserie ni délai d'attente.</p>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg">
              <button className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-100">
                <span>Y a-t-il un engagement qui m'enchaînerait à vie à votre service ?</span>
                <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
              <div className="p-5 pt-0 text-gray-600">
                <p>Non, nous ne sommes pas des geôliers numériques ! Tous nos plans sont sans engagement. Vous pouvez annuler à tout moment sans frais, comme quitter une conversation qui ne vous intéresse plus. La liberté, c'est notre credo.</p>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg">
              <button className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-100">
                <span>Quels moyens de paiement acceptez-vous pour ne pas me compliquer la vie ?</span>
                <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
              <div className="p-5 pt-0 text-gray-600">
                <p>Nous acceptons les cartes bancaires, virements SEPA et PayPal pour les entreprises. Pas de monnaie de singe ni de coquillages, juste les moyens de paiement modernes que vous connaissez déjà.</p>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg">
              <button className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-100">
                <span>Puis-je tester avant de m'engager, comme goûter un vin avant de commander la bouteille ?</span>
                <svg className="w-6 h-6 text-[#0080a3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
              <div className="p-5 pt-0 text-gray-600">
                <p>Bien sûr ! Nous offrons un essai gratuit pour tous nos plans, sans carte bancaire requise. C'est comme une dégustation gratuite dans un restaurant : vous goûtez, vous appréciez, et seulement après vous commandez. L'art de la dégustation numérique !</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <Image 
                src="/icons/speedometer.png" 
                alt="Compteur de vitesse" 
                width={64} 
                height={64} 
                className="mx-auto mb-4"
              />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Prêt à accélérer votre <span className="text-[#0080a3]">conformité IA</span> ?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Choisissez votre rythme et démarrez dès aujourd'hui. Que vous souhaitiez tester gratuitement ou bénéficier d'un accompagnement complet, MaydAI s'adapte à vos besoins et à votre budget.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="/contact" 
                className="bg-white text-[#0080a3] border-2 border-[#0080a3] px-8 py-4 rounded-full font-semibold text-lg hover:bg-[#0080a3] hover:text-white transition-colors duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 no-underline flex items-center gap-2"
              >
                <Image src="/icons/space-rocket-launch.png" alt="Fusée" width={20} height={20} className="w-5 h-5" />
                Commencer gratuitement
              </a>
              <a 
                href="/contact" 
                className="bg-white text-gray-700 px-8 py-4 rounded-full font-semibold text-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-300 shadow-md hover:shadow-lg no-underline flex items-center gap-2"
              >
                <Image src="/icons/chats.png" alt="Chat" width={20} height={20} className="w-5 h-5" />
                Parler à un expert
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Aucun engagement • Support inclus • Conformité garantie
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
