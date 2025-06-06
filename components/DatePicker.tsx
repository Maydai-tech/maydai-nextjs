'use client'

import { Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
  minDate?: string
  maxDate?: string
  className?: string
  disabled?: boolean
  required?: boolean
  label?: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Sélectionnez une date',
  error = false,
  minDate,
  maxDate,
  className = '',
  disabled = false,
  required = false,
  label
}: DatePickerProps) {
  const formatDisplayDate = (dateValue: string) => {
    if (!dateValue) return ''
    try {
      return new Date(dateValue).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateValue
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''} [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:bg-[#0080A3] [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:rounded hover:[&::-webkit-calendar-picker-indicator]:bg-[#006280] [&::-webkit-calendar-picker-indicator]:transition-colors`}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      {value && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Date sélectionnée</p>
              <p className="text-sm text-blue-700 mt-1 font-medium">
                {formatDisplayDate(value)}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!value && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Sélection de date</p>
              <p className="text-sm text-gray-600 mt-1">
                Cliquez sur le champ pour ouvrir le calendrier et sélectionner une date.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 