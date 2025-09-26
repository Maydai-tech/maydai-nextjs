'use client'

interface BillingToggleProps {
  billingCycle: 'monthly' | 'yearly'
  onToggle: () => void
}

export default function BillingToggle({ billingCycle, onToggle }: BillingToggleProps) {
  return (
    <div className="relative flex items-center justify-center space-x-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-100">
      {/* Section gauche */}
      <span className={`text-sm font-medium transition-colors duration-200 ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
        Mensuel
      </span>
      
      {/* Toggle centré */}
      <button
        onClick={onToggle}
        className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-2 hover:scale-110"
      >
        <span
          className={`${
            billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-sm`}
        />
      </button>
      
      {/* Section droite */}
      <span className={`text-sm font-medium transition-colors duration-200 ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
        Annuel
      </span>
      
      {/* Badge en position absolue pour ne pas affecter le centrage */}
      <span
        className={`absolute right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200
          ${billingCycle === 'yearly'
            ? 'bg-green-100/80 text-green-800 border-green-200 opacity-100 translate-y-0'
            : 'bg-transparent text-transparent border-transparent opacity-0 pointer-events-none translate-y-2'}
        `}
      >
        Économisez 20%
      </span>
    </div>
  )
}
