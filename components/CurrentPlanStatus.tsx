'use client'

import { CreditCard, Calendar, Download, Settings } from 'lucide-react'

interface CurrentPlanStatusProps {
  planName: string
  billingCycle: 'monthly' | 'yearly'
  nextBillingDate: string
  nextBillingAmount: number
  onManage: () => void
}

export default function CurrentPlanStatus({ 
  planName, 
  billingCycle, 
  nextBillingDate, 
  nextBillingAmount, 
  onManage 
}: CurrentPlanStatusProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-[#0080A3]/10 p-3 rounded-lg">
            <CreditCard className="h-6 w-6 text-[#0080A3]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Plan actuel</h3>
            <p className="text-gray-600">
              {planName} • Facturation {billingCycle === 'monthly' ? 'mensuelle' : 'annuelle'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Prochaine facturation</p>
            <p className="text-lg font-semibold text-gray-900">{nextBillingAmount}€</p>
            <p className="text-sm text-gray-500">{nextBillingDate}</p>
          </div>
          <button 
            onClick={onManage}
            className="px-4 py-2 text-sm font-medium text-[#0080A3] border border-[#0080A3] rounded-lg hover:bg-[#0080A3]/5 transition-colors"
          >
            Gérer
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Download className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Télécharger facture</span>
          </button>
          
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Historique</span>
          </button>
          
          <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Paramètres</span>
          </button>
        </div>
      </div>
    </div>
  )
}
