'use client'

import { useEffect, useState } from 'react'
import { Mail, HardDrive } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'

interface GeneralSectionProps {
  userEmail: string | undefined
}

export default function GeneralSection({ userEmail }: GeneralSectionProps) {
  const { getAccessToken } = useAuth()
  const { plan } = useUserPlan()
  const [storageUsage, setStorageUsage] = useState<{
    usedStorageMb: number
    maxStorageMb: number
    percentUsed: number
  } | null>(null)
  const [loadingStorage, setLoadingStorage] = useState(true)

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const token = getAccessToken()
        if (!token) return

        const res = await fetch(`/api/storage/usage`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setStorageUsage(data)
        }
      } catch (error) {
        console.error('Error fetching storage usage:', error)
      } finally {
        setLoadingStorage(false)
      }
    }

    fetchStorageUsage()
  }, [getAccessToken])

  const formatStorage = (storageMb: number): string => {
    if (storageMb >= 1024) {
      return `${(storageMb / 1024).toFixed(2)} Go`
    }
    return `${storageMb.toFixed(2)} Mo`
  }
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

      {/* Carte Stockage */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <HardDrive className="w-5 h-5 text-[#0080A3] mr-2" />
            Stockage
          </h3>
          <p className="text-gray-500 text-sm">Usage du stockage de vos fichiers de conformité</p>
        </div>

        {loadingStorage ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0080A3]"></div>
          </div>
        ) : storageUsage ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Espace utilisé
              </span>
              <span className="text-sm text-gray-900 font-semibold">
                {formatStorage(storageUsage.usedStorageMb)} / {formatStorage(storageUsage.maxStorageMb)}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  storageUsage.percentUsed >= 90
                    ? 'bg-red-500'
                    : storageUsage.percentUsed >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(storageUsage.percentUsed, 100)}%` }}
              />
            </div>

            {storageUsage.percentUsed >= 90 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">
                  ⚠️ Vous approchez de la limite de stockage. Supprimez des fichiers ou passez à un plan supérieur.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-50/80 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Impossible de charger les informations de stockage</p>
          </div>
        )}
      </div>
    </div>
  )
}
