'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import {
  Shield,
  BarChart3,
  Download,
  Bell,
  CheckCircle
} from 'lucide-react'
import Image from 'next/image'
import PlanCard from '@/components/Subscriptions/PlanCard'
import CurrentPlanStatus from '@/components/Subscriptions/CurrentPlanStatus'
import BillingToggle from '@/components/Subscriptions/BillingToggle'
import { useStripe } from '@/app/abonnement/hooks/useStripe'
import { getPlans } from '@/lib/stripe/config/plans'
import type { MaydAIPlan } from '@/lib/stripe/types'

interface SuccessPaymentPopupProps {
  onClose: () => void
}

export default function SuccessPaymentPopup({ onClose }: SuccessPaymentPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-200 scale-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Paiement réussi !
              </h3>

              <p className="text-gray-600 mb-8 leading-relaxed">
                Votre abonnement a été activé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de votre plan.
              </p>

              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-[#0080A3] text-white hover:bg-[#006d8a] rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />
                OK
              </button>
            </div>
          </div>
        </div>
  )
}