'use client'

interface BillingToggleProps {
  billingCycle: 'monthly' | 'yearly'
  onToggle: () => void
}

export default function BillingToggle({ billingCycle, onToggle }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
        Mensuel
      </span>
      <button
        onClick={onToggle}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2"
      >
        <span
          className={`${
            billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
      <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
        Annuel
      </span>
      {billingCycle === 'yearly' && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Économisez 20%
        </span>
      )}
    </div>
  )
}
