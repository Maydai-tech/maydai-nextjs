'use client'

import { CheckCircle, Star } from 'lucide-react'
import Image from 'next/image'

interface PlanCardProps {
  plan: {
    id: string
    name: string
    description: string
    price: { monthly: number; yearly: number }
    stripePriceId: { monthly: string; yearly: string }
    icon: string
    color: string
    features: string[]
    limitations?: string[]
    popular?: boolean
    free?: boolean
    custom?: boolean
  }
  billingCycle: 'monthly' | 'yearly'
  isCurrentPlan: boolean
  onSelect: (planId: string) => void
  onPayment: (plan: any) => void
}

export default function PlanCard({ plan, billingCycle, isCurrentPlan, onSelect, onPayment }: PlanCardProps) {
  const getPlanColor = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
      case 'purple':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-600',
          button: 'bg-purple-600 hover:bg-purple-700'
        }
      case 'gold':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-600',
          button: 'bg-gray-600 hover:bg-gray-700'
        }
    }
  }

  const colors = getPlanColor(plan.color)
  const isPopular = plan.popular || false
  const isFree = plan.free || false
  const isCustom = plan.custom || false

  // Check Icon component inspired by the tarifs page
  const CheckIcon = () => (
    <svg className="w-6 h-6 text-[#0080a3] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
    </svg>
  )

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 hover:shadow-xl flex flex-col ${
        isCurrentPlan 
          ? 'border-[#0080A3] ring-2 ring-[#0080A3]/20' 
          : isPopular
          ? 'border-[#0080A3] shadow-2xl'
          : 'border-gray-200'
      }`}
    >
      {isPopular && (
        <span className="absolute top-0 -translate-y-1/2 bg-[#0080A3] text-white text-xs font-bold px-3 py-1 rounded-full uppercase left-1/2 transform -translate-x-1/2">
          Recommandé
        </span>
      )}
      
      <div className="p-8 flex flex-col flex-grow">
        {/* Plan Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="mb-3">
            <Image 
              src={`/icons/${plan.icon}`} 
              alt={plan.name} 
              width={48} 
              height={48} 
              className="w-12 h-12" 
            />
          </div>
          <h2 className="text-2xl font-bold text-center" style={{ color: '#0080a3' }}>
            {plan.name}
          </h2>
        </div>
        
        {/* Price */}
        <div className="mb-4 text-center">
          {isFree ? (
            <>
              <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>0€</span>
              <span className="text-gray-500"> (Gratuit)</span>
            </>
          ) : isCustom ? (
            <>
              <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>1K€</span>
              <span className="text-gray-500"> (Mission 1 mois)</span>
            </>
          ) : (
            <>
              <span className="text-5xl font-extrabold" style={{ color: '#0080a3' }}>
                {billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly}€
              </span>
              <span className="text-gray-500">
                /{billingCycle === 'yearly' ? 'an' : 'mois'}
              </span>
            </>
          )}
        </div>
        
        <p className="text-gray-600 mb-6 h-20 text-center">{plan.description}</p>

        {/* Action Button */}
        <button 
          onClick={() => onPayment(plan)}
          className={`w-full text-center font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${
            isCurrentPlan
              ? 'bg-[#0080A3] text-white hover:bg-[#006d8a]'
              : isPopular
              ? 'bg-[#0080A3] text-white hover:bg-[#006d8a]'
              : 'bg-white text-[#0080A3] border border-[#0080A3] hover:bg-[#0080A3] hover:bg-opacity-10'
          }`}
        >
          {isCurrentPlan ? 'Plan actuel' : 
           isFree ? 'Commencer' :
           isCustom ? 'Attachez vos ceintures !' : 'C\'est parti !'}
        </button>
        
        <hr className="my-6" />
        
        {/* Features */}
        <ul className="space-y-4 flex-grow">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckIcon />
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
