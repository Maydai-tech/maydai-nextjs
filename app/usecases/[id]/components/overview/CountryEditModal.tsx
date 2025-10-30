'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import ReactFlagsSelect from 'react-flags-select'

interface CountryEditModalProps {
  isOpen: boolean
  onClose: () => void
  currentCountries: string[]
  onSave: (countries: string[]) => Promise<void>
  saving?: boolean
}

// Mapping bidirectionnel : codes ISO vers noms français
const isoToCountryName: { [key: string]: string } = {
  'fr': 'France',
  'us': 'États-Unis',
  'ca': 'Canada',
  'gb': 'Royaume-Uni',
  'de': 'Allemagne',
  'es': 'Espagne',
  'it': 'Italie',
  'au': 'Australie',
  'jp': 'Japon',
  'cn': 'Chine',
  'in': 'Inde',
  'br': 'Brésil',
  'mx': 'Mexique',
  'nl': 'Pays-Bas',
  'be': 'Belgique',
  'ch': 'Suisse',
  'se': 'Suède',
  'no': 'Norvège',
  'dk': 'Danemark',
  'fi': 'Finlande',
  'pt': 'Portugal',
  'pl': 'Pologne',
  'ru': 'Russie',
  'kr': 'Corée du Sud',
  'sg': 'Singapour',
  'nz': 'Nouvelle-Zélande',
  'ar': 'Argentine',
  'za': 'Afrique du Sud',
  'si': 'Slovénie'
}

// Mapping inverse : noms vers codes ISO
const countryNameToIso: { [key: string]: string } = {
  'France': 'fr',
  'FR': 'fr',
  'États-Unis': 'us',
  'USA': 'us',
  'US': 'us',
  'United States': 'us',
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
  'SI': 'si'
}

export default function CountryEditModal({ isOpen, onClose, currentCountries, onSave, saving = false }: CountryEditModalProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])

  // Convertir les noms de pays actuels en codes ISO au chargement
  useEffect(() => {
    if (isOpen && currentCountries) {
      const isoCodes = currentCountries
        .map(country => countryNameToIso[country.trim()])
        .filter(code => code) // Filtrer les codes non trouvés
      setSelectedCountries(isoCodes)
    }
  }, [isOpen, currentCountries])

  const handleCountrySelect = (countryCode: string) => {
    const newSelectedCountries = [...selectedCountries]
    const index = newSelectedCountries.indexOf(countryCode.toLowerCase())
    
    if (index > -1) {
      // Retirer le pays s'il est déjà sélectionné
      newSelectedCountries.splice(index, 1)
    } else {
      // Ajouter le pays s'il n'est pas sélectionné
      newSelectedCountries.push(countryCode.toLowerCase())
    }
    
    setSelectedCountries(newSelectedCountries)
  }

  const removeCountry = (countryCode: string) => {
    const newSelectedCountries = selectedCountries.filter(country => country !== countryCode)
    setSelectedCountries(newSelectedCountries)
  }

  const handleSave = async () => {
    // Convertir les codes ISO en noms de pays français
    const countryNames = selectedCountries
      .map(code => isoToCountryName[code])
      .filter(name => name) // Filtrer les noms non trouvés

    try {
      await onSave(countryNames)
      onClose()
    } catch (error) {
      // L'erreur sera gérée par le composant parent
    }
  }

  const handleCancel = () => {
    // Reset to original selection
    const isoCodes = currentCountries
      .map(country => countryNameToIso[country.trim()])
      .filter(code => code)
    setSelectedCountries(isoCodes)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      ></div>
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Modifier les pays de déploiement
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Sélectionnez les pays où le cas d'usage est déployé
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              disabled={saving}
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            {/* Sélecteur de pays */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher et sélectionner des pays
              </label>
              <div className="relative">
                <ReactFlagsSelect
                  countries={['US', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PT', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LU', 'LV', 'LT', 'EE', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'VE', 'EC', 'BO', 'PY', 'SR', 'GY', 'FK', 'GF', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN', 'TH', 'VN', 'PH', 'ID', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK', 'LK', 'NP', 'AF', 'IR', 'IQ', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IL', 'PS', 'TR', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'ET', 'KE', 'UG', 'TZ', 'RW', 'BI', 'DJ', 'SO', 'ER', 'SS', 'CF', 'TD', 'CM', 'GQ', 'GA', 'CG', 'CD', 'AO', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'ZA', 'MZ', 'MW', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE', 'MV', 'RU', 'BY', 'UA', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'MN']}
                  selected=""
                  onSelect={(code) => handleCountrySelect(code)}
                  searchable
                  placeholder="🌍 Rechercher et sélectionner un pays..."
                  className="w-full"
                  selectButtonClassName="w-full px-4 py-3 text-left border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors border-gray-300"
                  showSelectedLabel={false}
                  showOptionLabel={true}
                />
              </div>
            </div>

            {/* Pays sélectionnés */}
            {selectedCountries.length > 0 && (
              <div className="bg-white border-2 border-[#0080A3] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Pays sélectionnés
                  </h4>
                  <span className="bg-[#0080A3] text-white text-sm font-medium px-3 py-1 rounded-full">
                    {selectedCountries.length}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCountries.map((countryCode) => (
                    <div 
                      key={countryCode} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={`https://flagcdn.com/w40/${countryCode}.png`}
                          alt={`Drapeau ${isoToCountryName[countryCode]}`}
                          className="w-6 h-4 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {isoToCountryName[countryCode] || countryCode.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => removeCountry(countryCode)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition-all duration-200"
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* État vide */}
            {selectedCountries.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="text-4xl mb-4">🌍</div>
                  <h4 className="text-lg font-medium text-gray-600 mb-2">
                    Aucun pays sélectionné
                  </h4>
                  <p className="text-sm text-gray-500">
                    Utilisez le sélecteur ci-dessus pour choisir les pays de déploiement
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              disabled={saving}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}