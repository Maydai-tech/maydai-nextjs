'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User as UserIcon, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useUserPlan } from '@/app/abonnement/hooks/useUserPlan'

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { plan } = useUserPlan()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const menuItems = [
    {
      label: 'Paramètres',
      icon: Settings,
      href: '/settings',
      action: () => router.push('/settings')
    },
    {
      label: 'Se déconnecter',
      icon: LogOut,
      action: handleSignOut,
      isDestructive: true
    }
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton trigger */}
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-[#0080A3] hover:bg-gray-50 transition-all duration-200 shadow-sm cursor-pointer"
        title="Menu profil"
      >
        <UserIcon className="h-6 w-6" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Info utilisateur */}
          {user?.email && (
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center mb-1">
                <UserIcon className="h-4 w-4 mr-3 text-gray-400" />
                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
              </div>
              <div className="ml-7">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-[#0080A3]/10 text-[#0080A3]">
                  {plan.displayName}
                </span>
              </div>
            </div>
          )}

          {/* Menu items */}
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={() => {
                  item.action()
                  setIsOpen(false)
                }}
                className={`w-full flex items-center px-4 py-2 text-sm transition-colors ${
                  item.isDestructive
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#0080A3]'
                }`}
              >
                <Icon className={`h-4 w-4 mr-3 ${item.isDestructive ? 'text-red-500' : 'text-gray-400'}`} />
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}