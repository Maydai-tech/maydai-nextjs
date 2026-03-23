'use client'

import { useState } from 'react'
import { Send, SkipForward } from 'lucide-react'

interface DateInputStepProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSkip?: () => void
  error?: string
}

export default function DateInputStep({
  value,
  onChange,
  onSubmit,
  onSkip,
  error,
}: DateInputStepProps) {
  const [focused, setFocused] = useState(false)

  const handleChange = (raw: string) => {
    let digits = raw.replace(/[^\d]/g, '').substring(0, 8)
    let formatted = ''

    if (digits.length >= 1) {
      formatted = digits.substring(0, 2)
      if (digits.length >= 2) {
        formatted += '/'
        if (digits.length >= 3) {
          formatted += digits.substring(2, 4)
          if (digits.length >= 4) {
            formatted += '/'
            if (digits.length >= 5) {
              formatted += digits.substring(4, 8)
            }
          }
        }
      }
    }

    onChange(formatted)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 bg-white border-2 rounded-xl px-4 py-3 transition-colors ${
        error ? 'border-red-300' : focused ? 'border-[#0080A3]' : 'border-gray-200'
      }`}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="JJ/MM/AAAA"
          maxLength={10}
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent font-mono tracking-wider"
          autoFocus
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="flex-shrink-0 p-1.5 rounded-lg bg-[#0080A3] text-white hover:bg-[#006280] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Format : JJ/MM/AAAA (ex: 15/06/2025)</p>
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0080A3] transition-colors"
          >
            <SkipForward className="h-3 w-3" />
            Passer
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
