'use client'

import { Mail } from 'lucide-react'

interface GeneralSectionProps {
  userEmail: string | undefined
}

export default function GeneralSection({ userEmail }: GeneralSectionProps) {
  return (
    <div className="space-y-8">
      {/* Header avec avatar */}
      <div className="flex items-center space-x-6 p-6 bg-blue-50/50 rounded-xl border border-gray-100">
        <div className="flex-shrink-0">
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Informations générales</h2>
          <p className="text-gray-500">Gérez vos informations personnelles et les paramètres de votre compte</p>
        </div>
      </div>

      {/* Carte Email */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <Mail className="w-5 h-5 text-[#0080A3] mr-2" />
            Adresse e-mail
          </h3>
          <p className="text-gray-500 text-sm">Votre adresse e-mail associée à ce compte</p>
        </div>

        <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-900 font-medium">{userEmail}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
