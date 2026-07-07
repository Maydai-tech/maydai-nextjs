'use client'

import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (date: string) => void
  currentDate?: string
  title?: string
  saving?: boolean
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function DatePickerModal({
  isOpen,
  onClose,
  onSave,
  currentDate,
  title = 'Sélectionner une date',
  saving = false
}: DatePickerModalProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse current date or use today
  const parseDate = (dateStr?: string): Date => {
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return new Date()
  }

  const initialDate = parseDate(currentDate)
  const [selectedDate, setSelectedDate] = useState<Date | null>(currentDate ? initialDate : null)
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth())
  const [viewYear, setViewYear] = useState(initialDate.getFullYear())

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const date = parseDate(currentDate)
      setSelectedDate(currentDate ? date : null)
      setViewMonth(date.getMonth())
      setViewYear(date.getFullYear())
    }
  }, [isOpen, currentDate])

  if (!isOpen) return null

  // Get days in month
  const getDaysInMonth = (month: number, year: number): number => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month: number, year: number): number => {
    const day = new Date(year, month, 1).getDay()
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1
  }

  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDayOfMonth = getFirstDayOfMonth(viewMonth, viewYear)

  // Previous month days for padding
  const prevMonthDays = getDaysInMonth(viewMonth === 0 ? 11 : viewMonth - 1, viewMonth === 0 ? viewYear - 1 : viewYear)

  // Navigate months
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Check if date is selected
  const isSelected = (day: number, month: number, year: number): boolean => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  // Check if date is today
  const isToday = (day: number, month: number, year: number): boolean => {
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  // Select a day
  const selectDay = (day: number, month: number, year: number) => {
    setSelectedDate(new Date(year, month, day))
  }

  // Format date for saving (YYYY-MM-DD)
  const formatDateForSave = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Handle save
  const handleSave = () => {
    if (selectedDate) {
      onSave(formatDateForSave(selectedDate))
    }
  }

  // Build calendar grid
  const buildCalendarDays = () => {
    const days: React.ReactNode[] = []

    // Previous month days (grayed out)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = prevMonthDays - i
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      days.push(
        <button
          key={`prev-${day}`}
          type="button"
          onClick={() => {
            selectDay(day, prevMonth, prevYear)
            goToPrevMonth()
          }}
          className="h-10 w-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {day}
        </button>
      )
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const selected = isSelected(day, viewMonth, viewYear)
      const todayDate = isToday(day, viewMonth, viewYear)

      days.push(
        <button
          key={`current-${day}`}
          type="button"
          onClick={() => selectDay(day, viewMonth, viewYear)}
          className={`
            h-10 w-10 flex items-center justify-center rounded-lg transition-all duration-200 font-medium
            ${selected
              ? 'bg-[#0080A3] text-white shadow-md'
              : todayDate
                ? 'bg-[#0080A3]/10 text-[#0080A3] border-2 border-[#0080A3]'
                : 'text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          {day}
        </button>
      )
    }

    // Next month days (grayed out)
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7
    const nextMonthDays = totalCells - (firstDayOfMonth + daysInMonth)
    for (let day = 1; day <= nextMonthDays; day++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          onClick={() => {
            selectDay(day, nextMonth, nextYear)
            goToNextMonth()
          }}
          className="h-10 w-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {day}
        </button>
      )
    }

    return days
  }

  // Format selected date for display
  const formatSelectedDate = (): string => {
    if (!selectedDate) return 'Aucune date sélectionnée'
    return selectedDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0080A3] to-[#006280] px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Selected date preview */}
          <p className="text-white/90 text-sm mt-2 capitalize">
            {formatSelectedDate()}
          </p>
        </div>

        {/* Calendar */}
        <div className="p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-2 text-gray-600 hover:text-[#0080A3] hover:bg-[#0080A3]/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">
              {MONTHS[viewMonth]} {viewYear}
            </h3>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 text-gray-600 hover:text-[#0080A3] hover:bg-[#0080A3]/10 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {buildCalendarDays()}
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(today)
                setViewMonth(today.getMonth())
                setViewYear(today.getFullYear())
              }}
              className="px-3 py-1.5 text-sm font-medium text-[#0080A3] hover:bg-[#0080A3]/10 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Effacer
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedDate}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0080A3] rounded-lg hover:bg-[#006280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
