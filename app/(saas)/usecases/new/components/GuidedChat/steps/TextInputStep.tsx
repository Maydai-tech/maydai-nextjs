'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface TextInputStepProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  maxLength?: number
  error?: string
}

export default function TextInputStep({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxLength,
  error,
}: TextInputStepProps) {
  const [focused, setFocused] = useState(false)

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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
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
      {maxLength && (
        <p className="text-xs text-gray-400 text-right">{value.length}/{maxLength}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
