'use client'

import React, { useState } from 'react'
import { Edit3 } from 'lucide-react'
import CountryMapModal from './CountryMapModal'
import CountryEditModal from './CountryEditModal'

interface CountryDeploymentDisplayProps {
  deploymentCountries?: string[]
  className?: string
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
  'SI': 'si'
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
    'SI': 'Slovénie'
  }
  
  return displayNames[country] || country
}

export function CountryDeploymentDisplay({ deploymentCountries = [], className = '', onUpdateUseCase, updating = false }: CountryDeploymentDisplayProps) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const hasCountries = deploymentCountries && deploymentCountries.length > 0
  const maxDisplayCountries = 3
  const displayCountries = hasCountries ? deploymentCountries.slice(0, maxDisplayCountries) : []
  const remainingCount = hasCountries ? deploymentCountries.length - maxDisplayCountries : 0

  const openMapModal = () => {
    setIsMapModalOpen(true)
  }

  const closeMapModal = () => {
    setIsMapModalOpen(false)
  }

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

  // Fonction pour gérer le clic - logique simplifiée
  const handleClick = () => {
    if (!hasCountries && onUpdateUseCase) {
      // Si pas de pays et on peut éditer, ouvrir directement l'éditeur
      openEditModal()
    } else if (hasCountries) {
      // Sinon ouvrir la carte si on a des pays
      openMapModal()
    }
  }

  return (
    <>
      {!hasCountries ? (
        // Cas sans pays
        <div 
          className={`group relative block w-full max-w-full bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 rounded-xl border border-gray-200 transition-all duration-200 ${
            onUpdateUseCase ? 'cursor-pointer hover:from-gray-100 hover:to-gray-150 hover:shadow-md hover:border-gray-300' : ''
          } ${className}`}
          onClick={onUpdateUseCase ? handleClick : undefined}
          title={onUpdateUseCase ? "Cliquer pour ajouter des pays" : undefined}
        >
          {/* En-tête avec titre */}
          <div className="px-3 pt-2 pb-1">
            <h4 className="text-sm font-medium text-gray-700">Pays de déploiement</h4>
          </div>
          
          {/* Contenu */}
          <div className="px-3 pb-1">
            <div className="flex items-center">
              <span className="text-sm font-medium">Aucun pays spécifié</span>
              
              {/* Icône modifier */}
              {onUpdateUseCase && (
                <div className="ml-3 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                  <Edit3 className="h-4 w-4 text-gray-500" />
                </div>
              )}
              
              {/* Tooltip */}
              {onUpdateUseCase && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Cliquer pour ajouter des pays
                  </div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Texte explicatif sous le contenu */}
          {onUpdateUseCase && (
            <div className="px-3 pb-2">
              <p className="text-xs text-gray-500">Cliquer pour ajouter</p>
            </div>
          )}
        </div>
      ) : (
        // Cas avec pays
        <div 
          className={`group relative block w-full max-w-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl border border-blue-200 transition-all duration-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:shadow-md hover:border-blue-300 ${className}`}
          onClick={handleClick}
          title="Cliquer pour voir la carte"
        >
          {/* En-tête avec titre */}
          <div className="px-3 pt-2 pb-1">
            <h4 className="text-sm font-medium text-blue-800">Pays de déploiement</h4>
          </div>
          
          {/* Contenu avec pays */}
          <div className="px-3 pb-1">
            <div className="flex flex-wrap items-center gap-2">
            {displayCountries.map((country, index) => {
              const flagCode = countryToFlagCode[country.trim()]
              const displayName = getDisplayName(country.trim())
              
              return (
                <div key={index} className="flex items-center space-x-1 min-w-0">
                  {flagCode && (
                    <img
                      src={`https://flagcdn.com/w20/${flagCode}.png`}
                      alt={`Drapeau ${displayName}`}
                      className="w-4 h-3 object-cover rounded-sm border border-gray-200 flex-shrink-0"
                      onError={(e) => {
                        // Si l'image ne charge pas, on masque l'élément
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="text-sm font-semibold truncate">{displayName}</span>
                  {index < displayCountries.length - 1 && <span className="text-blue-500">,</span>}
                </div>
              )
            })}
              {remainingCount > 0 && (
                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  +{remainingCount}
                </span>
              )}
            </div>
          </div>
          
          {/* Texte explicatif sous les pays */}
          <div className="px-3 pb-2">
            <p className="text-xs text-blue-600">Cliquer pour voir et modifier</p>
          </div>
        </div>
      )}

      <CountryMapModal
        isOpen={isMapModalOpen}
        onClose={closeMapModal}
        deploymentCountries={deploymentCountries}
        onUpdateUseCase={onUpdateUseCase}
        updating={updating}
      />
      
      <CountryEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        currentCountries={deploymentCountries}
        onSave={handleCountryUpdate}
        saving={updating}
      />
    </>
  )
}