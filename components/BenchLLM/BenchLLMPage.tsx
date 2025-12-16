'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { BenchLLMModel, BenchLLMFilters, BenchLLMSort, BenchLLMPagination, SortableColumn } from '@/lib/types/bench-llm'
import { formatBenchmarkValue, getCountryFlag, isLongContext, isSmallModel, isOpenSource, formatContextLength, formatConsumption } from '@/lib/utils/bench-llm'
import { getProviderIcon } from '@/lib/provider-icons'

const PROVIDERS = [
  { name: 'OpenAI', value: 'OpenAI' },
  { name: 'Anthropic', value: 'Anthropic' },
  { name: 'Google', value: 'Google' },
  { name: 'Meta', value: 'Meta' },
  { name: 'Qwen', value: 'Alibaba (Qwen)' },
  { name: 'Mistral', value: 'Mistral AI' },
  { name: 'DeepSeek', value: 'DeepSeek' },
  { name: 'xAI', value: 'xAI' },
]

const COLUMN_HEADERS = [
  { key: 'model_name' as SortableColumn, label: 'Model', mobile: true },
  { key: 'model_provider' as SortableColumn, label: 'Provider', mobile: true },
  { key: 'country' as SortableColumn, label: 'Country', mobile: false },
  { key: 'llm_leader_rank' as SortableColumn, label: 'LLM Leader Rank', mobile: false },
  { key: 'compl_ai_rank' as SortableColumn, label: 'Compl AI Rank', mobile: true },
  { key: 'comparia_rank' as SortableColumn, label: 'Comparia Rank', mobile: false },
  { key: 'input_cost_per_million' as SortableColumn, label: 'Input $/M', mobile: false },
  { key: 'output_cost_per_million' as SortableColumn, label: 'Output $/M', mobile: false },
  { key: 'model_size' as SortableColumn, label: 'Size', mobile: false },
  { key: 'gpqa_score' as SortableColumn, label: 'GPQA', mobile: true },
  { key: 'aime_2025_score' as SortableColumn, label: 'AIME 2025', mobile: true },
  { key: 'license' as SortableColumn, label: 'License', mobile: false },
  { key: 'context_length' as SortableColumn, label: 'Context', mobile: false },
  { key: 'consumption_wh_per_1k_tokens' as SortableColumn, label: 'Consumption Wh (1000 tokens)', mobile: false },
  { key: 'release_date' as SortableColumn, label: 'Release Date', mobile: false },
  { key: 'knowledge_cutoff' as SortableColumn, label: 'Knowledge Cutoff', mobile: false },
]

export default function BenchLLMPage() {
  const { getAccessToken } = useAuth()
  const [models, setModels] = useState<BenchLLMModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<BenchLLMPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<BenchLLMFilters>({})
  const [sort, setSort] = useState<BenchLLMSort>({
    sortBy: 'compl_ai_rank',
    sortOrder: 'asc',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [visibleColumnStart, setVisibleColumnStart] = useState(0)

  // Débounce de la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Détection mobile/tablette
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Chargement des données
  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('Non authentifié')
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder,
      })

      if (debouncedSearchTerm) {
        params.append('searchTerm', debouncedSearchTerm)
      }

      if (filters.provider && filters.provider.length > 0) {
        params.append('provider', filters.provider.join(','))
      }

      if (filters.license && filters.license.length > 0) {
        params.append('license', filters.license.join(','))
      }

      if (filters.size && filters.size.length > 0) {
        params.append('size', filters.size.join(','))
      }

      if (filters.multimodal) {
        params.append('multimodal', 'true')
      }

      if (filters.open) {
        params.append('open', 'true')
      }

      if (filters.longContext) {
        params.append('longContext', 'true')
      }

      if (filters.small) {
        params.append('small', 'true')
      }

      const response = await fetch(`/api/bench-llm/models?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors du chargement des données')
      }

      const data = await response.json()
      console.log('Bench LLM - API Response:', data)
      setModels(data.models)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Error fetching models:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, sort, filters, debouncedSearchTerm, getAccessToken])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleSort = (column: SortableColumn) => {
    setSort({
      sortBy: column,
      sortOrder: sort.sortBy === column && sort.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }

  const toggleFilter = (filterType: keyof BenchLLMFilters, value?: string) => {
    setFilters((prev) => {
      if (filterType === 'provider' || filterType === 'license' || filterType === 'size') {
        const current = (prev[filterType] as string[]) || []
        if (value) {
          const newValue = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value]
          return { ...prev, [filterType]: newValue.length > 0 ? newValue : undefined }
        }
      } else {
        return { ...prev, [filterType]: !prev[filterType] }
      }
      return prev
    })
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const getSortIcon = (column: SortableColumn) => {
    if (sort.sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sort.sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-[#0080A3]" />
    ) : (
      <ArrowDown className="w-4 h-4 text-[#0080A3]" />
    )
  }

  const getVisibleColumns = () => {
    if (!isMobile) {
      return COLUMN_HEADERS
    }
    return COLUMN_HEADERS.slice(visibleColumnStart, visibleColumnStart + 6)
  }

  const canScrollLeft = isMobile && visibleColumnStart > 0
  const canScrollRight = isMobile && visibleColumnStart + 6 < COLUMN_HEADERS.length

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bench LLM</h1>

        {/* Filtres rapides */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">QUICK FILTERS</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleFilter('multimodal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.multimodal
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Multimodal
            </button>
            <button
              onClick={() => toggleFilter('open')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.open
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => toggleFilter('longContext')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.longContext
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Long Context
            </button>
            <button
              onClick={() => toggleFilter('small')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.small
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Small (&lt;8B)
            </button>
          </div>
        </div>

        {/* Filtres par provider */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Provider Filters</div>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((provider) => {
              const iconPath = getProviderIcon(provider.value)
              const isActive = filters.provider?.includes(provider.value)
              return (
                <button
                  key={provider.value}
                  onClick={() => toggleFilter('provider', provider.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0080A3] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Image
                    src={iconPath}
                    alt={provider.name}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain"
                  />
                  <span>{provider.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un modèle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] outline-none"
            />
          </div>
        </div>

        {/* Navigation colonnes mobile */}
        {isMobile && (
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setVisibleColumnStart(Math.max(0, visibleColumnStart - 1))}
              disabled={!canScrollLeft}
              className={`px-4 py-2 rounded-lg ${
                canScrollLeft
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              Colonnes {visibleColumnStart + 1}-{Math.min(visibleColumnStart + 6, COLUMN_HEADERS.length)} sur {COLUMN_HEADERS.length}
            </span>
            <button
              onClick={() => setVisibleColumnStart(Math.min(COLUMN_HEADERS.length - 6, visibleColumnStart + 1))}
              disabled={!canScrollRight}
              className={`px-4 py-2 rounded-lg ${
                canScrollRight
                  ? 'bg-[#0080A3] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto"></div>
              <p className="mt-4 text-gray-600">Chargement des modèles...</p>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="flex items-center text-red-600">
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <div className={`overflow-x-auto ${isMobile ? '' : 'max-h-[calc(100vh-400px)]'}`}>
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input type="checkbox" className="rounded" />
                    </th>
                    {getVisibleColumns().map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(col.key)}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {getSortIcon(col.key)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan={getVisibleColumns().length + 1} className="px-4 py-8 text-center text-gray-500">
                        Aucun modèle trouvé
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => (
                      <tr key={model.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input type="checkbox" className="rounded" />
                        </td>
                        {getVisibleColumns().map((col) => {
                          const value = model[col.key as keyof BenchLLMModel]
                          let displayValue: string | React.ReactNode = '-'

                          if (col.key === 'model_name') {
                            displayValue = model.model_name || '-'
                          } else if (col.key === 'model_provider') {
                            if (model.model_provider) {
                              const iconPath = getProviderIcon(model.model_provider)
                              displayValue = (
                                <div className="flex items-center justify-center">
                                  <Image
                                    src={iconPath}
                                    alt={model.model_provider}
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 object-contain"
                                    title={model.model_provider}
                                  />
                                </div>
                              )
                            } else {
                              displayValue = '-'
                            }
                          } else if (col.key === 'country') {
                            displayValue = getCountryFlag(model.country) || '-'
                          } else if (col.key === 'llm_leader_rank' || col.key === 'compl_ai_rank' || col.key === 'comparia_rank') {
                            displayValue = formatBenchmarkValue(value, 'rank')
                          } else if (col.key === 'input_cost_per_million' || col.key === 'output_cost_per_million') {
                            displayValue = formatBenchmarkValue(value, 'cost')
                          } else if (col.key === 'gpqa_score' || col.key === 'aime_2025_score') {
                            displayValue = formatBenchmarkValue(value, 'percentage')
                          } else if (col.key === 'context_length') {
                            displayValue = formatContextLength(value as number | null)
                          } else if (col.key === 'consumption_wh_per_1k_tokens') {
                            displayValue = formatConsumption(value as number | null)
                          } else if (col.key === 'release_date' || col.key === 'knowledge_cutoff') {
                            if (value && typeof value === 'string') {
                              displayValue = formatBenchmarkValue(value, 'date')
                            } else {
                              displayValue = '-'
                            }
                          } else {
                            displayValue = formatBenchmarkValue(value, 'text')
                          }

                          return (
                            <td key={col.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {displayValue}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} modèles)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    pagination.page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Précédent
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    pagination.page === pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Légende */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Légende</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>NR:</strong> Not Rated</p>
            <p><strong>ND:</strong> Not Disclosed</p>
            <p><strong>NA:</strong> Not Available</p>
          </div>
        </div>
      </div>
    </div>
  )
}

