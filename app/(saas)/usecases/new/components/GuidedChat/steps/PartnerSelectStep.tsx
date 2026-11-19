'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Send } from 'lucide-react'
import { getProviderIcon } from '@/lib/provider-icons'
import Tooltip from '@/components/Tooltip'
import type { ModelProviderOption } from '../../../types'

interface PartnerSelectStepProps {
  partners: ModelProviderOption[]
  value: string
  onSelect: (partnerName: string, partnerId?: number) => void
  loading?: boolean
  error?: string
}

export default function PartnerSelectStep({
  partners,
  value,
  onSelect,
  loading,
  error,
}: PartnerSelectStepProps) {
  const [otherSelected, setOtherSelected] = useState(false)
  const [otherValue, setOtherValue] = useState('')

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0080A3] border-t-transparent mx-auto mb-2" />
        <p className="text-sm text-gray-500">Chargement des partenaires...</p>
      </div>
    )
  }

  const handlePartnerClick = (partner: ModelProviderOption) => {
    setOtherSelected(false)
    setOtherValue('')
    onSelect(partner.name, partner.id)
  }

  const handleOtherSubmit = () => {
    if (otherValue.trim()) {
      onSelect(otherValue.trim(), undefined)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {partners.map((partner) => {
          const isSelected = value === partner.name && !otherSelected
          return (
            <div
              key={partner.id}
              role="button"
              tabIndex={0}
              onClick={() => handlePartnerClick(partner)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePartnerClick(partner) } }}
              className={`flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-[#0080A3] bg-[#0080A3]/5'
                  : 'border-gray-200 hover:border-[#0080A3]/50 hover:bg-gray-50'
              }`}
            >
              <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-[#0080A3]' : 'border-gray-300'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-[#0080A3]" />}
              </div>
              <Image
                src={getProviderIcon(partner.name)}
                alt={partner.name}
                width={20}
                height={20}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <span className="text-sm font-medium text-gray-900 flex-1">{partner.name}</span>
              {partner.tooltip_title && (
                <Tooltip
                  title={partner.tooltip_title}
                  shortContent={partner.tooltip_short_content || ''}
                  fullContent={partner.tooltip_full_content}
                  icon={partner.tooltip_icon}
                  rank={partner.tooltip_rank}
                  rankText={partner.tooltip_rank_text}
                  type="answer"
                  position="auto"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Option "Autre" */}
      <div className="space-y-2">
        <button
          onClick={() => {
            setOtherSelected(true)
          }}
          className={`flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all duration-200 w-full ${
            otherSelected
              ? 'border-[#0080A3] bg-[#0080A3]/5'
              : 'border-gray-200 hover:border-[#0080A3]/50 hover:bg-gray-50'
          }`}
        >
          <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            otherSelected ? 'border-[#0080A3]' : 'border-gray-300'
          }`}>
            {otherSelected && <div className="w-2 h-2 rounded-full bg-[#0080A3]" />}
          </div>
          <span className="text-sm font-medium text-gray-900">Autre</span>
        </button>

        {otherSelected && (
          <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 ml-2">
            <input
              type="text"
              value={otherValue}
              onChange={(e) => setOtherValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleOtherSubmit()
                }
              }}
              placeholder="Nom du partenaire technologique..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              autoFocus
            />
            <button
              onClick={handleOtherSubmit}
              disabled={!otherValue.trim()}
              className="flex-shrink-0 p-1.5 rounded-lg bg-[#0080A3] text-white hover:bg-[#006280] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
