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
  'CA': 'ca',
  'Royaume-Uni': 'gb',
  'United Kingdom': 'gb',
  'UK': 'gb',
  'GB': 'gb',
  'Allemagne': 'de',
  'Germany': 'de',
  'DE': 'de',
  'Espagne': 'es',
  'Spain': 'es',
  'ES': 'es',
  'Italie': 'it',
  'Italy': 'it',
  'IT': 'it',
  'Australie': 'au',
  'Australia': 'au',
  'AU': 'au',
  'Japon': 'jp',
  'Japan': 'jp',
  'JP': 'jp',
  'Chine': 'cn',
  'China': 'cn',
  'CN': 'cn',
  'Inde': 'in',
  'India': 'in',
  'IN': 'in',
  'Brésil': 'br',
  'Brazil': 'br',
  'BR': 'br',
  'Mexique': 'mx',
  'Mexico': 'mx',
  'MX': 'mx',
  'Pays-Bas': 'nl',
  'Netherlands': 'nl',
  'NL': 'nl',
  'Belgique': 'be',
  'Belgium': 'be',
  'BE': 'be',
  'Suisse': 'ch',
  'Switzerland': 'ch',
  'CH': 'ch',
  'Suède': 'se',
  'Sweden': 'se',
  'SE': 'se',
  'Norvège': 'no',
  'Norway': 'no',
  'NO': 'no',
  'Danemark': 'dk',
  'Denmark': 'dk',
  'DK': 'dk',
  'Finlande': 'fi',
  'Finland': 'fi',
  'FI': 'fi',
  'Portugal': 'pt',
  'PT': 'pt',
  'Pologne': 'pl',
  'Poland': 'pl',
  'PL': 'pl',
  'Russie': 'ru',
  'Russia': 'ru',
  'RU': 'ru',
  'Corée du Sud': 'kr',
  'South Korea': 'kr',
  'KR': 'kr',
  'Singapour': 'sg',
  'Singapore': 'sg',
  'SG': 'sg',
  'Nouvelle-Zélande': 'nz',
  'New Zealand': 'nz',
  'NZ': 'nz',
  'Argentine': 'ar',
  'AR': 'ar',
  'Afrique du Sud': 'za',
  'South Africa': 'za',
  'ZA': 'za',
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

// Mapping inverse pour normaliser les codes ISO en noms français (sécurité)
const codeToCountryName: { [key: string]: string } = {
  'FR': 'France',
  'US': 'États-Unis',
  'CA': 'Canada',
  'GB': 'Royaume-Uni',
  'DE': 'Allemagne',
  'ES': 'Espagne',
  'IT': 'Italie',
  'AU': 'Australie',
  'JP': 'Japon',
  'CN': 'Chine',
  'IN': 'Inde',
  'BR': 'Brésil',
  'MX': 'Mexique',
  'NL': 'Pays-Bas',
  'BE': 'Belgique',
  'CH': 'Suisse',
  'SE': 'Suède',
  'NO': 'Norvège',
  'DK': 'Danemark',
  'FI': 'Finlande',
  'PT': 'Portugal',
  'PL': 'Pologne',
  'RU': 'Russie',
  'KR': 'Corée du Sud',
  'SG': 'Singapour',
  'NZ': 'Nouvelle-Zélande',
  'AR': 'Argentine',
  'ZA': 'Afrique du Sud',
  'SI': 'Slovénie',
  'IE': 'Irlande'
}

// Fonction de normalisation pour convertir les codes ISO en noms français si nécessaire
const normalizeCountries = (countries: string[]): string[] => {
  if (!countries || !Array.isArray(countries)) {
    return []
  }
  
  return countries.map(country => {
    const trimmed = country.trim()
    // Si c'est un code ISO (2 lettres majuscules), le convertir en nom français
    if (trimmed.length === 2 && trimmed === trimmed.toUpperCase() && codeToCountryName[trimmed]) {
      return codeToCountryName[trimmed]
    }
    return trimmed
  }).filter(Boolean)
}

export function CountryDeploymentDisplay({ deploymentCountries = [], className = '', onUpdateUseCase, updating = false }: CountryDeploymentDisplayProps) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Normaliser les pays au cas où des codes ISO arrivent
  const normalizedCountries = normalizeCountries(deploymentCountries || [])
  
  const hasCountries = normalizedCountries && normalizedCountries.length > 0
  const maxDisplayCountries = 3
  const displayCountries = hasCountries ? normalizedCountries.slice(0, maxDisplayCountries) : []
  const remainingCount = hasCountries ? normalizedCountries.length - maxDisplayCountries : 0

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
          className={`group relative block w-full max-w-full rounded-xl transition-all duration-200 ${
            onUpdateUseCase ? 'cursor-pointer hover:shadow-md' : ''
          } ${className}`}
          style={{ 
            backgroundColor: '#f1fdfa',
            borderColor: '#0080a3',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
          onClick={onUpdateUseCase ? handleClick : undefined}
          title={onUpdateUseCase ? "Cliquer pour ajouter des pays" : undefined}
        >
          {/* En-tête avec titre */}
          <div className="px-3 pt-2 pb-1">
            <h4 className="text-sm font-medium" style={{ color: '#0080a3' }}>Pays de déploiement</h4>
          </div>
          
          {/* Contenu */}
          <div className="px-3 pb-1">
            <div className="flex items-center">
              <span className="text-sm font-medium" style={{ color: '#0080a3' }}>Aucun pays spécifié</span>
              
              {/* Icône modifier */}
              {onUpdateUseCase && (
                <div className="ml-3 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                  <Edit3 className="h-4 w-4" style={{ color: '#0080a3' }} />
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
              <p className="text-xs" style={{ color: '#0080a3' }}>Cliquer pour ajouter</p>
            </div>
          )}
        </div>
      ) : (
        // Cas avec pays
        <div 
          className={`group relative block w-full max-w-full rounded-xl transition-all duration-200 cursor-pointer hover:shadow-md ${className}`}
          style={{ 
            backgroundColor: '#f1fdfa',
            borderColor: '#0080a3',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
          onClick={handleClick}
          title="Cliquer pour voir la carte"
        >
          {/* En-tête avec titre */}
          <div className="px-3 pt-2 pb-1">
            <h4 className="text-sm font-medium" style={{ color: '#0080a3' }}>Pays de déploiement</h4>
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
                  <span className="text-sm font-semibold truncate" style={{ color: '#0080a3' }}>{displayName}</span>
                  {index < displayCountries.length - 1 && <span style={{ color: '#0080a3' }}>,</span>}
                </div>
              )
            })}
              {remainingCount > 0 && (
                <span className='text-sm px-2 py-0.5 rounded-full flex-shrink-0' style={{ color: '#0080a3', backgroundColor: '#f1fdfa' }}>
                  +{remainingCount}
                </span>
              )}
            </div>
          </div>
          
          {/* Texte explicatif sous les pays */}
          <div className="px-3 pb-2">
            <p className="text-xs" style={{ color: '#0080a3' }}>Cliquer pour voir et modifier</p>
          </div>
        </div>
      )}

      <CountryMapModal
        isOpen={isMapModalOpen}
        onClose={closeMapModal}
        deploymentCountries={normalizedCountries}
        onUpdateUseCase={onUpdateUseCase}
        updating={updating}
      />
      
      <CountryEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        currentCountries={normalizedCountries}
        onSave={handleCountryUpdate}
        saving={updating}
      />
    </>
  )
}