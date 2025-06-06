'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-auth'
import { 
  ArrowLeft, 
  Brain, 
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Search,
  HelpCircle,
  Calendar
} from 'lucide-react'


interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
}

interface FormData {
  name: string
  deployment_date: string
  responsible_service: string
  technology_partner: string
  llm_model_version: string
  ai_category: string
  system_type: string
  description: string
}

interface Question {
  id: keyof FormData
  question: string
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date'
  options?: string[] | { label: string; examples: string[] }[]
  placeholder?: string
  maxLength?: number
  hasOtherOption?: boolean
}

export default function NewUseCasePage() {
  // Add animation styles
  const animationStyles = `
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `
  const { user, session, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    deployment_date: '',
    responsible_service: '',
    technology_partner: '',
    llm_model_version: '',
    ai_category: '',
    system_type: '',
    description: ''
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [otherValue, setOtherValue] = useState('')
  const api = useApiCall()

  const companyId = searchParams.get('company')

  // Fonction de validation du format de date DD/MM/YYYY
  const validateDateFormat = (dateString: string): boolean => {
    if (!dateString) return true // Champ optionnel
    
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = dateString.match(dateRegex)
    
    if (!match) return false
    
    const [, day, month, year] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    return date.getDate() == parseInt(day) &&
           date.getMonth() == parseInt(month) - 1 &&
           date.getFullYear() == parseInt(year)
  }

  const questions: Question[] = [
    {
      id: 'name',
      question: 'Nom cas d\'usage IA ?',
      type: 'text',
      placeholder: 'ex: Système de recommandation produits',
      maxLength: 50
    },
    {
      id: 'deployment_date',
      question: 'Date de déploiement ou prévue ?',
      type: 'text',
      placeholder: 'DD/MM/YYYY (ex: 15/06/2025)',
      maxLength: 10
    },
    {
      id: 'responsible_service',
      question: 'Service en charge du cas d\'usage IA ?',
      type: 'select',
      options: [
        'Ressources Humaines (RH)',
        'Marketing',
        'Commercial / Ventes',
        'Finance / Comptabilité',
        'Production / Opérations',
        'Recherche et Développement (R&D)',
        'Systèmes d\'Information (SI) / IT',
        'Juridique',
        'Achats / Approvisionnement',
        'Service Client',
        'Qualité',
        'Autre'
      ]
    },
    {
      id: 'technology_partner',
      question: 'Partenaire technologique ?',
      type: 'checkbox',
      options: ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Qwen', 'Mistral', 'DeepSeek', 'xAI', 'Grok'],
      hasOtherOption: true
    },
    {
      id: 'llm_model_version',
      question: 'Modèle et version du LLM ?',
      type: 'checkbox',
      options: [], // Will be populated dynamically based on selected partners
      hasOtherOption: true
    },
    {
      id: 'ai_category',
      question: 'Dans quelle catégorie d\'IA votre cas d\'usage s\'inscrit-il ?',
      type: 'radio',
      options: [
        { 
          label: 'Traitement du langage naturel (TAL)', 
          examples: ['ChatGPT', 'DeepL', 'Google Traduction'] 
        },
        { 
          label: 'Vision par ordinateur', 
          examples: ['DALL-E', 'Midjourney'] 
        },
        { 
          label: 'Apprentissage automatique (Machine Learning)', 
          examples: ['TensorFlow', 'scikit-learn'] 
        },
        { 
          label: 'Robotique', 
          examples: ['Boston Dynamics Atlas', 'ASIMO'] 
        },
        { 
          label: 'Systèmes experts', 
          examples: ['MYCIN', 'DENDRAL'] 
        },
        { 
          label: 'Logiciels métiers', 
          examples: ['Salesforce Einstein AI', 'Diabolocom AI', 'Guru'] 
        },
        { 
          label: 'Apprentissage / e-learning', 
          examples: ['Didask'] 
        }
      ]
    },
    {
      id: 'system_type',
      question: 'Système autonome ou produit ?',
      type: 'radio',
      options: [
        { 
          label: 'Système autonome', 
          examples: ['Chatbot indépendant', 'Assistant virtuel', 'Système de recommandation autonome'] 
        },
        { 
          label: 'Produit', 
          examples: ['Fonctionnalité intégrée', 'Module IA dans une application', 'Composant d\'un service existant'] 
        }
      ]
    },
    {
      id: 'description',
      question: 'Brève description du système IA ?',
      type: 'textarea',
      placeholder: 'Décrivez en détail le cas d\'usage, son objectif et son fonctionnement...'
    }
  ]

  // Partner to models mapping
  const partnerModels = {
    'OpenAI': ['GPT-4o', 'GPT-4', 'GPT-3.5 Turbo'],
    'Anthropic': ['Claude 3.7 Sonnet', 'Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'],
    'Google': ['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 1.0 Ultra', 'Gemini 2'],
    'Meta': ['Llama 3', 'Llama 2', 'Llama 3.1'],
    'Qwen': ['Qwen2', 'Qwen1.5', 'Qwen'],
    'Mistral': ['Mistral 7B', 'Mistral 8x7B', 'Mistral NeMo 12B', 'Mistral Instruct 7B Q4', 'Mistral Small 3.1', 'Mistral Large'],
    'DeepSeek': ['DeepSeek-V2', 'DeepSeek-Coder'],
    'xAI': ['Grok-1.5', 'Grok-1'],
    'Microsoft': ['Copilot', 'Azure OpenAI Service']
  }

  // Get available models based on selected partners
  const getAvailableModels = () => {
    const techPartnerQuestion = questions.find(q => q.id === 'technology_partner')
    if (!techPartnerQuestion || currentQuestionIndex <= questions.indexOf(techPartnerQuestion)) {
      return []
    }

    const selectedPartners = formData.technology_partner?.split(', ').filter(p => p.trim()) || []
    const availableModels = new Set<string>()
    
    selectedPartners.forEach(partner => {
      const models = partnerModels[partner as keyof typeof partnerModels]
      if (models) {
        models.forEach(model => availableModels.add(model))
      }
    })

    return Array.from(availableModels).sort()
  }

  // Update current question with dynamic models
  const currentQuestion = { 
    ...questions[currentQuestionIndex],
    ...(questions[currentQuestionIndex].id === 'llm_model_version' && {
      options: getAvailableModels()
    })
  }
  
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router, mounted])

  useEffect(() => {
    if (user && mounted && companyId) {
      fetchCompany()
    } else if (mounted && !companyId) {
      router.push('/dashboard/companies')
    }
  }, [user, mounted, companyId])

  const fetchCompany = async () => {
    try {
      if (!session?.access_token || !companyId) return
      
      const response = await api.get(`/api/companies/${companyId}`)
      
      if (response.status === 404) {
        router.push('/dashboard/companies')
        return
      } else if (response.data) {
        setCompany(response.data)
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      router.push('/dashboard/companies')
    }
  }

  const validateCurrentQuestion = () => {
    const value = formData[currentQuestion.id]
    
    // For checkbox questions, check if at least one option is selected or other value is provided
    if (currentQuestion.type === 'checkbox') {
      // Special case for LLM models: skip validation if no models are available
      if (currentQuestion.id === 'llm_model_version' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
        return true // Allow skipping if no partners selected
      }
      
      if (selectedOptions.length === 0 && !otherValue.trim()) {
        setError('Veuillez sélectionner au moins une option')
        return false
      }
    } else if (currentQuestion.id === 'deployment_date') {
      // For deployment date, validate format if provided
      if (value && !validateDateFormat(value)) {
        setError('Format de date invalide. Utilisez le format DD/MM/YYYY (ex: 15/06/2025)')
        return false
      }
    } else {
      // For other question types (text, textarea, etc.)
      if (!value || !value.trim()) {
        setError('Cette réponse est requise')
        return false
      }
    }
    
    setError('')
    return true
  }

  const handleNext = () => {
    if (validateCurrentQuestion()) {
      if (isLastQuestion) {
        handleSubmit()
      } else {
        setCurrentQuestionIndex(prev => prev + 1)
        setSearchTerm('')
        // Reset checkbox states when moving to next question
        if (currentQuestion.type === 'checkbox') {
          setSelectedOptions([])
          setOtherValue('')
        }
      }
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1)
      setError('')
      setSearchTerm('')
      // Reset checkbox states when moving to previous question
      if (currentQuestion.type === 'checkbox') {
        setSelectedOptions([])
        setOtherValue('')
      }
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    
    try {
      const response = await api.post('/api/usecases', {
        name: formData.name,
        deployment_date: formData.deployment_date,
        responsible_service: formData.responsible_service,
        technology_partner: formData.technology_partner,
        llm_model_version: formData.llm_model_version,
        ai_category: formData.ai_category,
        system_type: formData.system_type,
        description: formData.description,
        status: 'draft',
        company_id: companyId
      })

      if (response.data) {
        router.push(`/dashboard/${companyId}`)
      }
    } catch (error) {
      console.error('Error creating use case:', error)
      setError('Erreur lors de la création du cas d\'usage')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (value: string) => {
    console.log('Form input changed:', currentQuestion.id, '=', value) // Debug log
    setFormData(prev => ({ ...prev, [currentQuestion.id]: value }))
    if (error) {
      setError('')
    }
  }

  const handleDateInputChange = (value: string, inputElement?: HTMLInputElement) => {
    // Remove non-digits except slashes for formatting
    let digits = value.replace(/[^\d]/g, '')
    
    // Limit to 8 digits (DDMMYYYY)
    digits = digits.substring(0, 8)
    
    // Format as DD/MM/YYYY with automatic slash insertion
    let formatted = ''
    let cursorPosition = 0
    
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
    
    setFormData(prev => ({ ...prev, deployment_date: formatted }))
    if (error) {
      setError('')
    }

    // Auto-position cursor after slash
    if (inputElement) {
      setTimeout(() => {
        if (digits.length === 2 || digits.length === 4) {
          inputElement.setSelectionRange(formatted.length, formatted.length)
        }
      }, 0)
    }
  }

  const handleChipSelect = (option: string) => {
    handleInputChange(option)
    setSearchTerm('')
  }

  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value)
    // Si l'utilisateur tape, on met à jour la valeur en temps réel
    handleInputChange(value)
  }

  const handleCheckboxChange = (option: string, checked: boolean) => {
    let newSelectedOptions = [...selectedOptions]
    
    if (checked) {
      if (!newSelectedOptions.includes(option)) {
        newSelectedOptions.push(option)
      }
    } else {
      newSelectedOptions = newSelectedOptions.filter(item => item !== option)
      // Si on décoche "Autre", on vide aussi le champ texte
      if (option === 'Autre') {
        setOtherValue('')
      }
    }
    
    setSelectedOptions(newSelectedOptions)
    
    // Combine selected options and other value
    const allValues = [...newSelectedOptions.filter(item => item !== 'Autre')]
    if (otherValue.trim() && newSelectedOptions.includes('Autre')) {
      allValues.push(otherValue.trim())
    }
    
    handleInputChange(allValues.join(', '))
  }

  const handleOtherValueChange = (value: string) => {
    setOtherValue(value)
    
    // S'assurer que "Autre" est sélectionné quand on tape
    if (value.trim() && !selectedOptions.includes('Autre')) {
      setSelectedOptions(prev => [...prev, 'Autre'])
    }
    
    // Combine selected options and other value
    const allValues = [...selectedOptions.filter(item => item !== 'Autre')]
    if (value.trim()) {
      allValues.push(value.trim())
    }
    
    handleInputChange(allValues.join(', '))
  }

  const getFilteredOptions = () => {
    if (!currentQuestion.options) return []
    
    // Handle radio buttons with {label, examples} structure
    if (currentQuestion.type === 'radio') {
      return []
    }
    
    // Handle regular string options
    const stringOptions = currentQuestion.options as string[]
    return stringOptions.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentQuestion.type !== 'textarea') {
      e.preventDefault()
      handleNext()
    }
  }

  // Show loading state during SSR and initial client load
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Redirect if no user
  if (!user) {
    return null
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement de l'entreprise...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div className="max-w-2xl mx-auto py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href={`/dashboard/${companyId}`}
            className="inline-flex items-center text-gray-600 hover:text-[#0080A3] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Retour au dashboard</span>
          </Link>
          
          <div className="flex items-center justify-center mb-4">
            <div className="bg-[#0080A3]/10 p-3 rounded-lg">
              <Brain className="h-8 w-8 text-[#0080A3]" />
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Nouveau cas d'usage IA
          </h1>
          <p className="text-gray-600">
            {company.name} • {company.industry}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} sur {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#0080A3] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mb-6">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              {currentQuestion.question}
            </h2>
            {currentQuestion.maxLength && (
              <p className="text-sm text-gray-500">
                Maximum {currentQuestion.maxLength} caractères
              </p>
            )}
          </div>

          {/* Input based on question type */}
          {currentQuestion.type === 'text' && currentQuestion.id !== 'deployment_date' && (
            <input
              type="text"
              value={formData[currentQuestion.id]}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={currentQuestion.placeholder}
              maxLength={currentQuestion.maxLength}
              autoFocus
            />
          )}

          {/* Special date input for deployment_date */}
          {currentQuestion.type === 'text' && currentQuestion.id === 'deployment_date' && (
            <div className="relative">
              <input
                type="text"
                value={formData[currentQuestion.id]}
                onChange={(e) => handleDateInputChange(e.target.value, e.target)}
                onKeyPress={handleKeyPress}
                onFocus={(e) => {
                  // Position cursor at the beginning if empty
                  setTimeout(() => {
                    if (!e.target.value) {
                      e.target.setSelectionRange(0, 0)
                    }
                  }, 0)
                }}
                className={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors font-mono tracking-wider ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="DD/MM/YYYY"
                maxLength={10}
                autoFocus
              />
              {/* Helper text */}
              <div className="mt-2 text-sm text-gray-500">
                Format : JJ/MM/AAAA (ex: 15/06/2025)
              </div>
            </div>
          )}



          {currentQuestion.type === 'select' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm || formData[currentQuestion.id]}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors"
                  placeholder="Tapez votre choix ou sélectionnez un exemple ci-dessous"
                  autoFocus
                />
              </div>

              {/* Current Selection */}
              {formData[currentQuestion.id] && !searchTerm && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Sélection actuelle :</p>
                  <div className="inline-flex items-center px-3 py-2 bg-[#0080A3] text-white text-sm font-medium rounded-full">
                    {formData[currentQuestion.id]}
                    <button
                      onClick={() => {
                        handleInputChange('')
                        setSearchTerm('')
                      }}
                      className="ml-2 text-white hover:text-gray-200"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Examples Label */}
              <div>
                <p className="text-sm text-gray-500 mb-3">Exemples</p>
              </div>

              {/* Options as Chips */}
              <div className="flex flex-wrap gap-2">
                {getFilteredOptions().map((option) => (
                  <button
                    key={option}
                    onClick={() => handleChipSelect(option)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      formData[currentQuestion.id] === option && !searchTerm
                        ? 'bg-[#0080A3] text-white border-[#0080A3]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#0080A3] hover:text-[#0080A3]'
                    }`}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>

              {/* Custom value indicator */}
              {searchTerm && !(currentQuestion.options as string[])?.includes(searchTerm) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-sm">
                    <span className="font-medium">Valeur personnalisée :</span> "{searchTerm}"
                  </p>
                </div>
              )}

              {/* No results message for filtered examples */}
              {searchTerm && getFilteredOptions().length === 0 && (currentQuestion.options as string[])?.some(opt => opt.toLowerCase().includes(searchTerm.toLowerCase())) === false && (
                <p className="text-gray-500 text-center py-2 text-sm">Aucun exemple ne correspond à votre recherche</p>
              )}
            </div>
          )}

          {currentQuestion.type === 'textarea' && (
            <textarea
              rows={6}
              value={formData[currentQuestion.id]}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors resize-none ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={currentQuestion.placeholder}
              autoFocus
            />
          )}

          {currentQuestion.type === 'checkbox' && (
            <div className="space-y-8">
              {/* Help Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="flex items-center px-6 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium shadow-sm"
                >
                  <HelpCircle className="h-5 w-5 mr-2" />
                  Aide ?
                </button>
              </div>

              {/* No partners selected message for LLM models */}
              {currentQuestion.id === 'llm_model_version' && (!currentQuestion.options || currentQuestion.options.length === 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">
                    Aucun partenaire technologique sélectionné
                  </h3>
                  <p className="text-amber-700 mb-4">
                    Veuillez d'abord sélectionner au moins un partenaire technologique pour voir les modèles disponibles.
                  </p>
                  <button
                    onClick={() => setCurrentQuestionIndex(questions.findIndex(q => q.id === 'technology_partner'))}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux partenaires
                  </button>
                </div>
              )}

              {/* Checkbox Grid */}
              {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                {/* Left Column */}
                <div className="space-y-3">
                  {(currentQuestion.options as string[])?.slice(0, Math.ceil((currentQuestion.options as string[]).length / 2)).map((option) => (
                    <label key={option} className="group flex items-center space-x-4 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(option)}
                          onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                          className="w-5 h-5 text-[#0080A3] border-2 border-gray-300 rounded focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0 transition-all duration-200"
                        />
                        {selectedOptions.includes(option) && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-lg text-gray-700 group-hover:text-gray-900 transition-colors duration-200 font-medium">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {(currentQuestion.options as string[])?.slice(Math.ceil((currentQuestion.options as string[]).length / 2)).map((option) => (
                    <label key={option} className="group flex items-center space-x-4 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={selectedOptions.includes(option)}
                          onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                          className="w-5 h-5 text-[#0080A3] border-2 border-gray-300 rounded focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0 transition-all duration-200"
                        />
                        {selectedOptions.includes(option) && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-lg text-gray-700 group-hover:text-gray-900 transition-colors duration-200 font-medium">
                        {option}
                      </span>
                    </label>
                  ))}

                  {/* Other Option */}
                  {currentQuestion.hasOtherOption && (
                    <div className="space-y-3">
                      <label className="group flex items-center space-x-4 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-all duration-200">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedOptions.includes('Autre') || otherValue.trim() !== ''}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (!selectedOptions.includes('Autre')) {
                                  handleCheckboxChange('Autre', true)
                                }
                              } else {
                                setOtherValue('')
                                handleOtherValueChange('')
                                handleCheckboxChange('Autre', false)
                              }
                            }}
                            className="w-5 h-5 text-[#0080A3] border-2 border-gray-300 rounded focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0 transition-all duration-200"
                          />
                          {(selectedOptions.includes('Autre') || otherValue.trim() !== '') && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="text-lg text-gray-700 group-hover:text-gray-900 transition-colors duration-200 font-medium">
                          Autre
                        </span>
                      </label>

                      {/* Other Input Field - Only show when "Autre" is selected */}
                      {(selectedOptions.includes('Autre') || otherValue.trim() !== '') && (
                        <div className="ml-9 animate-fadeIn">
                          <input
                            type="text"
                            value={otherValue}
                            onChange={(e) => handleOtherValueChange(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:border-[#0080A3] focus:ring-2 focus:ring-[#0080A3] focus:ring-opacity-20 focus:outline-none transition-all duration-200"
                            placeholder="Spécifiez le partenaire technologique..."
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* Selected Summary */}
              {(selectedOptions.length > 0 || otherValue.trim()) && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                  <p className="text-blue-800 text-sm mb-3 font-semibold">
                    Partenaires sélectionnés :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOptions.filter(option => option !== 'Autre').map((option) => (
                      <span key={option} className="inline-flex items-center px-3 py-1 bg-[#0080A3] text-white text-sm font-medium rounded-full shadow-sm">
                        {option}
                        <button
                          onClick={() => handleCheckboxChange(option, false)}
                          className="ml-2 text-white hover:text-gray-200 transition-colors"
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {otherValue.trim() && (
                      <span className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-full shadow-sm">
                        {otherValue.trim()}
                        <button
                          onClick={() => {
                            setOtherValue('')
                            handleOtherValueChange('')
                            handleCheckboxChange('Autre', false)
                          }}
                          className="ml-2 text-white hover:text-gray-200 transition-colors"
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                  {(selectedOptions.length === 0 && !otherValue.trim()) && (
                    <p className="text-gray-500 text-sm italic">Aucun partenaire sélectionné</p>
                  )}
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'radio' && (
            <div className="space-y-4">
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                <div className="space-y-3">
                  {(currentQuestion.options as { label: string; examples: string[] }[]).map((option, index) => (
                    <label 
                      key={index} 
                      className={`group flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        formData[currentQuestion.id] === option.label
                          ? 'border-[#0080A3] bg-[#0080A3]/5'
                          : 'border-gray-200 hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center h-6 mt-1">
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option.label}
                            checked={formData[currentQuestion.id] === option.label}
                            onChange={() => handleInputChange(option.label)}
                            className="h-5 w-5 text-[#0080A3] border-2 border-gray-300 focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-semibold text-gray-900 mb-2">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Exemples : </span>
                            <span className="text-gray-500">{option.examples.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </button>

          <button
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center justify-center px-6 py-3 bg-[#0080A3] text-white font-medium rounded-lg hover:bg-[#006280] disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création en cours...
              </>
            ) : isLastQuestion ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Créer le cas d'usage
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>

        {/* Question Summary for Review */}
        {currentQuestionIndex > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vos réponses :</h3>
            <div className="space-y-2">
              {questions.slice(0, currentQuestionIndex).map((q, index) => (
                <div key={q.id} className="flex items-center text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-gray-600">{q.question}</span>
                  <span className="ml-2 font-medium text-gray-900 truncate">
                    {formData[q.id]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 