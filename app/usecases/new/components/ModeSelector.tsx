'use client'

import { ClipboardList, MessageSquare } from 'lucide-react'
import type { CreationMode } from '../types'

interface ModeSelectorProps {
  mode: CreationMode
  onChange: (mode: CreationMode) => void
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 bg-white rounded-xl shadow-sm p-1.5 max-w-sm mx-auto">
      <button
        onClick={() => onChange('form')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
          mode === 'form'
            ? 'bg-[#0080A3] text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <ClipboardList className="h-4 w-4" />
        <span>Formulaire</span>
      </button>
      <button
        onClick={() => onChange('chat')}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
          mode === 'chat'
            ? 'bg-[#0080A3] text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        <span>Chat guidé</span>
      </button>
    </div>
  )
}
