'use client'

import { useState, useEffect } from 'react'
import { Briefcase } from 'lucide-react'
import { INDUSTRIES_LIST, getIndustryById } from '@/lib/constants/industries'

export interface IndustrySelection {
  mainIndustryId: string
  subCategoryId: string
}

interface CompanySectorSelectorProps {
  value?: IndustrySelection
  onChange: (selection: IndustrySelection) => void
  error?: string
  required?: boolean
  disabled?: boolean
}

export default function CompanySectorSelector({
  value,
  onChange,
  error,
  required = false,
  disabled = false
}: CompanySectorSelectorProps) {
  const [mainIndustryId, setMainIndustryId] = useState(value?.mainIndustryId || '')
  const [subCategoryId, setSubCategoryId] = useState(value?.subCategoryId || '')

  // Get available sub-categories for the selected main industry
  const selectedIndustry = mainIndustryId ? getIndustryById(mainIndustryId) : null
  const availableSubCategories = selectedIndustry?.subCategories || []

  // Reset sub-category when main industry changes
  useEffect(() => {
    if (mainIndustryId !== value?.mainIndustryId) {
      setSubCategoryId('')
      onChange({ mainIndustryId: mainIndustryId || '', subCategoryId: '' })
    }
  }, [mainIndustryId])

  // Sync with external value changes
  useEffect(() => {
    if (value) {
      setMainIndustryId(value.mainIndustryId || '')
      setSubCategoryId(value.subCategoryId || '')
    }
  }, [value])

  const handleMainIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMainIndustryId = e.target.value
    setMainIndustryId(newMainIndustryId)
    setSubCategoryId('') // Reset sub-category
    onChange({ mainIndustryId: newMainIndustryId, subCategoryId: '' })
  }

  const handleSubCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSubCategoryId = e.target.value
    setSubCategoryId(newSubCategoryId)
    onChange({ mainIndustryId, subCategoryId: newSubCategoryId })
  }

  return (
    <div className="space-y-4">
      {/* Main Industry Select */}
      <div>
        <label htmlFor="mainIndustry" className="block text-sm font-medium text-gray-700 mb-2">
          Secteur d'activité principal {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Briefcase className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="mainIndustry"
            name="mainIndustry"
            required={required}
            disabled={disabled}
            value={mainIndustryId}
            onChange={handleMainIndustryChange}
            className={`w-full px-4 py-3 pl-10 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:outline-none transition-colors appearance-none ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-[#0080A3] focus:ring-[#0080A3]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">Sélectionnez un secteur principal</option>
            {INDUSTRIES_LIST.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-Category Select */}
      {mainIndustryId && (
        <div>
          <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-2">
            Sous-catégorie {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Briefcase className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="subCategory"
              name="subCategory"
              required={required && !!mainIndustryId}
              disabled={disabled || !mainIndustryId}
              value={subCategoryId}
              onChange={handleSubCategoryChange}
              className={`w-full px-4 py-3 pl-10 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:outline-none transition-colors appearance-none ${
                error
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-[#0080A3] focus:ring-[#0080A3]'
              } ${disabled || !mainIndustryId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">Sélectionnez une sous-catégorie</option>
              {availableSubCategories.map((subCategory) => (
                <option key={subCategory.id} value={subCategory.id}>
                  {subCategory.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
