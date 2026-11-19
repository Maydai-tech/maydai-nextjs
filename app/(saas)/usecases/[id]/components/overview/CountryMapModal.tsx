'use client'

import React, { useState } from 'react'
import { X, Edit3 } from 'lucide-react'
import WorldMap from '@/components/WorldMap'
import CountryEditModal from './CountryEditModal'

interface CountryMapModalProps {
  isOpen: boolean
  onClose: () => void
  deploymentCountries: string[]
  onUpdateUseCase?: (updates: { deployment_countries: string[] }) => Promise<void>
  updating?: boolean
}

// Mapping des noms de pays vers les codes ISO à 2 lettres pour les drapeaux
const countryToFlagCode: { [key: string]: string } = {
  'France': 'fr',
  'FR': 'fr',
  'USA': 'us',
  'US': 'us',
  'United States': 'us',
  'États-Unis': 'us',
  'Etats-Unis': 'us',
  'Canada': 'ca',
  'Royaume-Uni': 'gb',
  'United Kingdom': 'gb',
  'UK': 'gb',
  'Allemagne': 'de',
  'Germany': 'de',
  'Espagne': 'es',
  'Spain': 'es',
  'Italie': 'it',
  'Italy': 'it',
  'Australie': 'au',
  'Australia': 'au',
  'Japon': 'jp',
  'Japan': 'jp',
  'Chine': 'cn',
  'China': 'cn',
  'Inde': 'in',
  'India': 'in',
  'Brésil': 'br',
  'Brazil': 'br',
  'Mexique': 'mx',
  'Mexico': 'mx',
  'Pays-Bas': 'nl',
  'Netherlands': 'nl',
  'Belgique': 'be',
  'Belgium': 'be',
  'Suisse': 'ch',
  'Switzerland': 'ch',
  'Suède': 'se',
  'Sweden': 'se',
  'Norvège': 'no',
  'Norway': 'no',
  'Danemark': 'dk',
  'Denmark': 'dk',
  'Finlande': 'fi',
  'Finland': 'fi',
  'Portugal': 'pt',
  'Pologne': 'pl',
  'Poland': 'pl',
  'Russie': 'ru',
  'Russia': 'ru',
  'Corée du Sud': 'kr',
  'South Korea': 'kr',
  'Singapour': 'sg',
  'Singapore': 'sg',
  'Nouvelle-Zélande': 'nz',
  'New Zealand': 'nz',
  'Argentine': 'ar',
  'Afrique du Sud': 'za',
  'South Africa': 'za',
  'Slovénie': 'si',
  'Slovenia': 'si',
  'SI': 'si',
  'Irlande': 'ie',
  'Ireland': 'ie',
  'IE': 'ie'
}

// Noms d'affichage préférés pour les pays
const getDisplayName = (country: string): string => {
  const displayNames: { [key: string]: string } = {
    'USA': 'États-Unis',
    'US': 'États-Unis',
    'United States': 'États-Unis',
    'UK': 'Royaume-Uni',
    'United Kingdom': 'Royaume-Uni',
    'Germany': 'Allemagne',
    'Spain': 'Espagne',
    'Italy': 'Italie',
    'Australia': 'Australie',
    'Japan': 'Japon',
    'China': 'Chine',
    'India': 'Inde',
    'Brazil': 'Brésil',
    'Mexico': 'Mexique',
    'Netherlands': 'Pays-Bas',
    'Belgium': 'Belgique',
    'Switzerland': 'Suisse',
    'Sweden': 'Suède',
    'Norway': 'Norvège',
    'Denmark': 'Danemark',
    'Finland': 'Finlande',
    'Poland': 'Pologne',
    'Russia': 'Russie',
    'South Korea': 'Corée du Sud',
    'Singapore': 'Singapour',
    'New Zealand': 'Nouvelle-Zélande',
    'South Africa': 'Afrique du Sud',
    'Slovenia': 'Slovénie',
    'SI': 'Slovénie',
    'Ireland': 'Irlande',
    'IE': 'Irlande'
  }
  
  return displayNames[country] || country
}

export default function CountryMapModal({ isOpen, onClose, deploymentCountries, onUpdateUseCase, updating = false }: CountryMapModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const openEditModal = () => {
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
  }

  const handleCountryUpdate = async (countries: string[]) => {
    if (!onUpdateUseCase) return
    await onUpdateUseCase({ deployment_countries: countries })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Pays de déploiement
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {deploymentCountries.length} pays {deploymentCountries.length > 1 ? 'sélectionnés' : 'sélectionné'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {onUpdateUseCase && (
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Modifier
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Carte du monde */}
            <div className="mb-6">
              <WorldMap 
                deploymentCountries={deploymentCountries}
                className="border border-gray-200"
                showUseCaseCount={false}
              />
            </div>
            
            {/* Liste des pays */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Liste des pays
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deploymentCountries.map((country, index) => {
                  const flagCode = countryToFlagCode[country.trim()]
                  const displayName = getDisplayName(country.trim())
                  
                  return (
                    <div 
                      key={index}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      {flagCode && (
                        <img
                          src={`https://flagcdn.com/w40/${flagCode}.png`}
                          alt={`Drapeau ${displayName}`}
                          className="w-6 h-4 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            // Si l'image ne charge pas, on masque l'élément
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <span className="text-sm font-medium text-gray-800">
                        {displayName}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors duration-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'édition des pays */}
      <CountryEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        currentCountries={deploymentCountries}
        onSave={handleCountryUpdate}
        saving={updating}
      />
    </div>
  )
}