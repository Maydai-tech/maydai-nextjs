'use client'

import { useState } from 'react'
import ReactFlagsSelect from 'react-flags-select'
import { CheckCircle, X, Send } from 'lucide-react'
import { COUNTRY_CODES_LIST, isoCodeToFrenchName } from '../../../lib/countries'

interface CountrySelectStepProps {
  selectedCountries: string[]
  onChange: (countries: string[]) => void
  onSubmit: () => void
  error?: string
}

export default function CountrySelectStep({
  selectedCountries,
  onChange,
  onSubmit,
  error,
}: CountrySelectStepProps) {
  const [, setForceUpdate] = useState(0)

  const handleCountrySelect = (countryCode: string) => {
    const updated = selectedCountries.includes(countryCode)
      ? selectedCountries.filter(c => c !== countryCode)
      : [...selectedCountries, countryCode]
    onChange(updated)
    setForceUpdate(n => n + 1)
  }

  const removeCountry = (countryCode: string) => {
    onChange(selectedCountries.filter(c => c !== countryCode))
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <ReactFlagsSelect
          countries={COUNTRY_CODES_LIST}
          selected=""
          onSelect={handleCountrySelect}
          searchable
          placeholder="Rechercher un pays..."
          className="w-full"
          selectButtonClassName="w-full px-3 py-2.5 text-sm border-2 rounded-xl bg-white text-gray-900 border-gray-200 focus:border-[#0080A3] focus:ring-2 focus:ring-[#0080A3]/20"
          showSelectedLabel={false}
          showOptionLabel={true}
        />
      </div>

      {selectedCountries.length > 0 && (
        <div className="bg-white border-2 border-[#0080A3]/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-[#0080A3]" />
              <span className="text-sm font-medium text-gray-900">
                {selectedCountries.length} pays sélectionné{selectedCountries.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={onSubmit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0080A3] text-white text-xs font-medium hover:bg-[#006280] transition-colors"
            >
              <Send className="h-3 w-3" />
              Valider
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map(code => (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-700"
              >
                <img
                  src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
                  alt={code}
                  className="w-4 h-3 object-cover rounded-sm"
                />
                {isoCodeToFrenchName(code)}
                <button
                  onClick={() => removeCountry(code)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedCountries.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          Sélectionnez au moins un pays de déploiement.
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
