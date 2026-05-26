'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ListFilter } from 'lucide-react'
import { FUNNEL_CONFIG } from './types'

export function FunnelFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentStage = searchParams.get('stage') ?? ''

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set('stage', value)
    } else {
      params.delete('stage')
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="flex min-w-[200px] max-w-full flex-col gap-1.5 sm:max-w-xs">
      <span className="text-xs font-medium text-gray-600" id="funnel-filter-label">
        Étape funnel
      </span>
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        <select
          id="funnel-filter"
          value={currentStage}
          onChange={handleChange}
          aria-labelledby="funnel-filter-label"
          aria-label="Filtrer les leads par étape de conversion"
          className="h-10 w-full cursor-pointer rounded-md border border-gray-300 bg-white pl-3 pr-8 text-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3]"
        >
          <option value="">Toutes les étapes</option>
          {Object.entries(FUNNEL_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
