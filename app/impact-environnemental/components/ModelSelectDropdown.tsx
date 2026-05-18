'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronDown, Check } from 'lucide-react'
import { getProviderIcon } from '@/lib/provider-icons'
import type { EcoImpactModel } from '@/lib/impact-environnemental'

interface ModelSelectDropdownProps {
  label: string
  models: EcoImpactModel[]
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export default function ModelSelectDropdown({
  label,
  models,
  value,
  onChange,
  disabled = false,
}: ModelSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const labelId = useId()

  const selected = models.find((m) => m.id === value) ?? null

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const handleSelect = (modelId: string) => {
    onChange(modelId)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="w-full min-w-0">
      <span id={labelId} className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}
      </span>
      <div
        className={`relative flex items-center gap-3 w-full border border-slate-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-[#0080A3] ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={labelId}
          aria-controls={listboxId}
          disabled={disabled || models.length === 0}
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-center gap-3 p-3 text-left focus-visible:outline-none"
        >
          {selected ? (
            <>
              <Image
                src={getProviderIcon(selected.modelProvider)}
                alt=""
                width={24}
                height={24}
                className="rounded-sm shrink-0 object-contain"
                aria-hidden
              />
              <span className="text-sm font-medium text-slate-900 truncate">
                {selected.modelName}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500">Sélectionner un modèle</span>
          )}
          <ChevronDown
            className={`ml-auto w-5 h-5 text-slate-400 shrink-0 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>

        {open && models.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          >
            {models.map((model) => {
              const isSelected = model.id === value
              return (
                <li key={model.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(model.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:bg-slate-100 ${
                      isSelected ? 'bg-slate-50 text-[#0080A3]' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Image
                      src={getProviderIcon(model.modelProvider)}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-sm shrink-0 object-contain"
                      aria-hidden
                    />
                    <span className="flex-1 truncate font-medium">{model.modelName}</span>
                    {isSelected ? (
                      <Check className="w-4 h-4 shrink-0 text-[#0080A3]" aria-hidden />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
