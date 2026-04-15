'use client'

import { useEffect, useId, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useApiCall } from '@/lib/api-client-legacy'
import ReactFlagsSelect from 'react-flags-select'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Search,
  HelpCircle,
  X,
  Check,
  Sparkles,
  UserPlus,
  Users,
  Megaphone,
  Briefcase,
  Calculator,
  Factory,
  FlaskConical,
  MonitorSmartphone,
  Scale,
  ShoppingCart,
  Headset,
  ClipboardCheck,
  MoreHorizontal,
  MessageSquare,
  Eye,
  BrainCircuit,
  Bot,
  Network,
  GraduationCap,
  Cpu,
  Package,
  Loader2,
} from 'lucide-react'
import Image from 'next/image'
import { getProviderIcon } from '@/lib/provider-icons'
import { trackUseCaseCreation, trackLimitReached } from '@/lib/gtm'
import Tooltip from '@/components/Tooltip'
import InviteCollaboratorModal from '@/components/Collaboration/InviteCollaboratorModal'
import { useCompanyInfo } from '../[id]/hooks/useCompanyInfo'
import { loadCreationQuestions } from './questions-loader'
import { useModelProviders } from './hooks/useModelProviders'
import { useCreateUseCase } from './hooks/useCreateUseCase'
import { validateDeploymentDateFlexible } from './lib/validators'
import {
  DEPLOYMENT_PHASE_OPTIONS,
  getDeploymentDateFieldLabel,
} from '@/lib/deployment-status'
import { resolvePrimaryModelId, isCustomPartner as isCustomPartnerCheck } from './lib/model-resolver'
import { normalizeDeploymentCountriesToArray } from './lib/payload-builder'
import { ISO_TO_COUNTRY_NAME } from './lib/countries'
import { useCaseRoutes } from '../[id]/utils/routes'
import type { LucideIcon } from 'lucide-react'

/** Valeur factice du radio « Autre modèle… » (liste déroulante), non persistée en base. */
const LLM_MORE_MODELS_CARD_RADIO = '__LLM_MORE_MODELS_CARD__'

/** Icônes Lucide pour l’étape « Service en charge » (clés = libellés JSON). */
const RESPONSIBLE_SERVICE_ICONS: Record<string, LucideIcon> = {
  'Ressources Humaines (RH)': Users,
  'Communication / Marketing': Megaphone,
  'Commercial / Ventes': Briefcase,
  'Finance / Comptabilité': Calculator,
  'Production / Opérations': Factory,
  'Recherche et Développement (R&D)': FlaskConical,
  "Systèmes d'Information (SI) / IT": MonitorSmartphone,
  Juridique: Scale,
  'Achats / Approvisionnement': ShoppingCart,
  'Service Client': Headset,
  Qualité: ClipboardCheck,
  Autre: MoreHorizontal,
}

/** Icônes Lucide pour l’étape « Catégorie d’IA » (clés = libellés JSON). */
const AI_CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Large Language Model (LLM)': MessageSquare,
  'Vision par ordinateur': Eye,
  'Machine Learning': BrainCircuit,
  Robotique: Bot,
  'Systèmes experts': Network,
  'Logiciels métiers': Briefcase,
  'Apprentissage / e-learning': GraduationCap,
}

/** Infobulles juridiques (AI Act) — étape « Système autonome ou produit ». */
const SYSTEM_TYPE_LEGAL_TOOLTIP: Record<string, { title: string; shortContent: string }> = {
  'Système autonome': {
    title: 'Système autonome',
    shortContent:
      "Fonctionne de manière indépendante pour accomplir sa propre finalité, sans être le composant de sécurité d'un produit matériel. (Ex: Analyse de CV, Évaluation de solvabilité).",
  },
  Produit: {
    title: 'Produit',
    shortContent:
      "IA soumise aux normes de l'UE ou intégrée comme composant de sécurité dont la défaillance mettrait en danger la sécurité des personnes. (Ex: Assistance chirurgicale, Sécurité industrielle).",
  },
}

/** Codes ISO disponibles dans le sélecteur de pays de déploiement (aligné sur react-flags-select). */
const DEPLOYMENT_SELECTABLE_CODES: string[] = [
  'US', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PT', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ',
  'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LU', 'LV', 'LT', 'EE', 'CA', 'MX', 'BR', 'AR', 'CL',
  'CO', 'PE', 'UY', 'VE', 'EC', 'BO', 'PY', 'SR', 'GY', 'FK', 'GF', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN', 'TH',
  'VN', 'PH', 'ID', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK', 'LK', 'NP', 'AF', 'IR', 'IQ', 'SA', 'AE', 'KW', 'QA',
  'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IL', 'PS', 'TR', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'ET', 'KE', 'UG',
  'TZ', 'RW', 'BI', 'DJ', 'SO', 'ER', 'SS', 'CF', 'TD', 'CM', 'GQ', 'GA', 'CG', 'CD', 'AO', 'ZM', 'ZW', 'BW',
  'NA', 'SZ', 'LS', 'ZA', 'MZ', 'MW', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE', 'MV', 'RU', 'BY', 'UA', 'MD', 'GE',
  'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'MN',
]

/** États membres de l’UE (codes présents dans le sélecteur). */
const EU_COUNTRIES: string[] = [
  'FR', 'DE', 'IT', 'ES', 'BE', 'NL', 'LU', 'PT', 'AT', 'IE', 'FI', 'SE', 'DK', 'PL', 'CZ', 'HU', 'SK', 'SI',
  'EE', 'LV', 'LT', 'GR', 'BG', 'RO', 'HR', 'CY', 'MT',
]

interface Company {
  id: string
  name: string
  industry: string
  city: string
  country: string
}

interface ModelProvider {
  id: number
  name: string
  tooltip_title?: string
  tooltip_short_content?: string
  tooltip_full_content?: string
  tooltip_icon?: string
  tooltip_rank?: number
  tooltip_rank_text?: string
}

interface ModelData {
  id: string
  model_name: string
  model_type?: string
  version?: string
  notes_short?: string
  notes_long?: string
  variants?: string[]
  launch_date?: string
}

interface FormData {
  name: string
  deployment_phase: string
  deployment_date: string
  responsible_service: string
  technology_partner: string
  technology_partner_id?: number
  llm_model_version: string
  ai_category: string
  system_type: string
  deployment_countries: string
  description: string
}

interface Question {
  id: keyof FormData
  question: string
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'countries' | 'deployment_phase_and_date'
  options?: string[] | { label: string; examples: string[]; tooltip?: { title: string; shortContent: string; fullContent?: string; icon?: string }; modelData?: ModelData }[]
  placeholder?: string
  maxLength?: number
  hasOtherOption?: boolean
  tooltip?: {
    title: string
    shortContent: string
    fullContent?: string
    icon?: string
  }
}

const isoToCountryName = ISO_TO_COUNTRY_NAME

function CreateUseCasePageContent() {
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
    deployment_phase: '',
    deployment_date: '',
    responsible_service: '',
    technology_partner: '',
    llm_model_version: '',
    ai_category: '',
    system_type: '',
    deployment_countries: '',
    description: ''
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [isNextNavigating, setIsNextNavigating] = useState(false)
  const [error, setError] = useState<string>('')
  const [partners, setPartners] = useState<ModelProvider[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelData[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [otherRadioValue, setOtherRadioValue] = useState('')
  const [otherRadioSelected, setOtherRadioSelected] = useState(false)
  /** Étape LLM : carte « Autre modèle… » + liste des modèles au-delà du top 5 */
  const [llmMoreModelsCardSelected, setLlmMoreModelsCardSelected] = useState(false)
  const api = useApiCall()

  // Données des infobulles pour chaque partenaire technologique (fallback)
  const partnerInfo = {
    'Anthropic': {
      title: 'Anthropic',
      shortContent: 'Laboratoire d\'IA alignée créé par les frères Amodei, développeur de Claude.',
      fullContent: 'Fondé en 2021 par d\'anciens chercheurs seniors d\'OpenAI. Anthropic est axé sur la sécurité et l\'alignement de l\'IA via l\'approche "IA Constitutionnelle". Ils développent Claude et sont soutenus par Google et Amazon.',
      icon: '🧠',
      rank: 3
    },
    'Google': {
      title: 'Google',
      shortContent: 'Division IA de Google avec Gemini, leader technologique mondial.',
      fullContent: 'Google développe la famille Gemini depuis 2023. Leader technologique avec d\'importants investissements en recherche IA et infrastructure mondiale.',
      icon: '🔍',
      rank: 2
    },
    'Meta': {
      title: 'Meta',
      shortContent: 'Meta développe des modèles open-source avec Llama.',
      fullContent: 'Meta développe la famille Llama, open-source, depuis 2023. Approche communautaire favorisant l\'innovation collaborative mondiale.',
      icon: '👥',
      rank: 4
    },
    'Mistral': {
      title: 'Mistral',
      shortContent: 'Startup française spécialisée en IA générative, développeur de Mistral.',
      fullContent: 'Startup française fondée en 2023 par d\'anciens de Google et Meta. Spécialisée en IA générative, approche souveraine européenne.',
      icon: '🇫🇷',
      rank: 5
    },
    'OpenAI': {
      title: 'OpenAI',
      shortContent: 'Leader mondial de l\'IA générative avec ChatGPT et GPT-4.',
      fullContent: 'OpenAI est le leader mondial de l\'IA générative avec ChatGPT et GPT-4. Fondée en 2015, pionnière ayant popularisé les LLM grand public.',
      icon: '🤖',
      rank: 1
    },
    'Qwen': {
      title: 'Qwen',
      shortContent: 'Modèle IA développé par Alibaba Cloud.',
      fullContent: 'Qwen est développé par Alibaba Cloud. Approche orientée performance et efficacité pour les applications d\'entreprise.',
      icon: '☁️',
      rank: 6
    }
  }

  // Helper function pour récupérer les infobulles d'un provider (API en priorité, fallback sur partnerInfo)
  const getProviderTooltip = (providerName: string) => {
    // Chercher d'abord dans les données de l'API
    const providerFromApi = partners.find(p => p.name === providerName || p.name.toLowerCase() === providerName.toLowerCase())
    if (providerFromApi && (providerFromApi.tooltip_title || providerFromApi.tooltip_short_content)) {
      return {
        title: providerFromApi.tooltip_title || providerName,
        shortContent: providerFromApi.tooltip_short_content || '',
        fullContent: providerFromApi.tooltip_full_content,
        icon: providerFromApi.tooltip_icon || '💡',
        rank: providerFromApi.tooltip_rank,
        rankText: providerFromApi.tooltip_rank_text
      }
    }

    // Fallback sur partnerInfo si disponible
    const providerFromFallback = partnerInfo[providerName as keyof typeof partnerInfo]
    if (providerFromFallback) {
      return {
        title: providerFromFallback.title,
        shortContent: providerFromFallback.shortContent,
        fullContent: providerFromFallback.fullContent,
        icon: providerFromFallback.icon,
        rank: providerFromFallback.rank,
        rankText: undefined
      }
    }

    return null
  }

  // États pour la génération automatique avec Mistral AI
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [generatedDescription, setGeneratedDescription] = useState('')
  const [showGeneratedDescription, setShowGeneratedDescription] = useState(false)

  const companyId = searchParams.get('company')
  const { isOwner } = useCompanyInfo(companyId)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const deploymentPhaseHeadingId = useId()
  const responsibleServiceHeadingId = useId()
  const technologyPartnerHeadingId = useId()
  const llmModelHeadingId = useId()
  const aiCategoryHeadingId = useId()
  const systemTypeHeadingId = useId()
  const deploymentCountriesHeadingId = useId()
  const descriptionHeadingId = useId()

  // Fonction pour récupérer les partenaires depuis l'API
  const fetchPartners = async () => {
    try {
      setLoadingPartners(true)
      const response = await api.get('/api/model-providers')

      if (!response.data || response.data.length === 0) {
        setError('Aucun partenaire technologique disponible')
        setPartners([])
      } else {
        setPartners(response.data)
        setError('')
      }
    } catch (error) {
      console.error('Erreur lors du chargement des partenaires:', error)
      setError('Impossible de charger les partenaires technologiques')
      setPartners([])
    } finally {
      setLoadingPartners(false)
    }
  }

  // Charger les questions depuis le JSON
  const baseQuestions = loadCreationQuestions()

  // Construire le tableau de questions dans l'ordre avec les options dynamiques pour technology_partner
  const questions: Question[] = [
    baseQuestions.name,
    baseQuestions.deployment_date,
    baseQuestions.responsible_service,
    {
      ...baseQuestions.technology_partner,
      options: partners.map(partner => ({ label: partner.name, examples: [] })) // Liste dynamique des partenaires
    },
    baseQuestions.llm_model_version,
    baseQuestions.ai_category,
    baseQuestions.system_type,
    baseQuestions.deployment_countries,
    baseQuestions.description
  ] as Question[]

  // Fonction pour récupérer les modèles disponibles pour un provider
  const fetchAvailableModels = async (providerId: number) => {
    if (!providerId) {
      setAvailableModels([])
      return
    }

    try {
      setLoadingModels(true)
      // Ne pas vider la liste immédiatement - maintenir l'affichage pendant le chargement
      const response = await api.get(`/api/model-providers/${providerId}/models`)
      setAvailableModels(response.data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des modèles:', error)
      setAvailableModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  // Fonction synchrone pour récupérer les modèles depuis le state (pour compatibilité)
  const getAvailableModels = () => {
    const techPartnerQuestion = questions.find(q => q.id === 'technology_partner')
    if (!techPartnerQuestion || currentQuestionIndex <= questions.indexOf(techPartnerQuestion)) {
      return []
    }

    // Trier les modèles par date de lancement (plus récent au plus ancien)
    // Les modèles sans date en dernier, triés par nom
    const sortedModels = [...availableModels].sort((a, b) => {
      // Si les deux ont une date de lancement, trier par date DESC
      if (a.launch_date && b.launch_date) {
        const dateA = new Date(a.launch_date).getTime()
        const dateB = new Date(b.launch_date).getTime()
        if (dateB !== dateA) {
          return dateB - dateA // Plus récent en premier
        }
      }
      // Si seulement a a une date, a vient avant
      if (a.launch_date && !b.launch_date) return -1
      // Si seulement b a une date, b vient avant
      if (!a.launch_date && b.launch_date) return 1
      // Si aucun n'a de date, trier par nom
      return a.model_name.localeCompare(b.model_name)
    })

    return sortedModels
  }

  const findModelId = (modelName: string): string | null => {
    return resolvePrimaryModelId(modelName, availableModels)
  }

  const isCustomTechnologyPartner = (): boolean => {
    const selectedPartner = typeof formData.technology_partner === 'string' ? formData.technology_partner.trim() : ''
    if (!selectedPartner) return false
    return isCustomPartnerCheck(selectedPartner, partners)
  }

  // Update current question with dynamic models or text input for custom partners
  const currentQuestion = {
    ...questions[currentQuestionIndex],
    ...(questions[currentQuestionIndex].id === 'llm_model_version' && {
      // Si partenaire personnalisé, utiliser un champ texte, sinon afficher les modèles radio
      type: isCustomTechnologyPartner() ? 'text' : 'radio',
      options: isCustomTechnologyPartner() ? [] : getAvailableModels().map(model => ({ 
        label: model.model_name, 
        examples: [],
        modelData: model // Inclure les données complètes du modèle
      })),
      placeholder: isCustomTechnologyPartner() ? 'Spécifiez le modèle utilisé...' : undefined
    })
  }

  const llmPickerSorted =
    currentQuestion.id === 'llm_model_version' && !isCustomTechnologyPartner()
      ? getAvailableModels()
      : []
  const llmTopModels = llmPickerSorted.slice(0, 5)
  const llmOtherModels = llmPickerSorted.slice(5)

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
      router.push('/dashboard/registries')
    }
  }, [user, mounted, companyId])

  // Additional safety check for SSR
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
  }, [])

  // Étape LLM : carte « Autre modèle… » cochée si la valeur sauvegardée est hors du top 5 (ex. retour « Précédent »)
  useEffect(() => {
    if (questions[currentQuestionIndex]?.id !== 'llm_model_version') return
    if (isCustomTechnologyPartner() || loadingModels) return
    if (otherRadioSelected) {
      setLlmMoreModelsCardSelected(false)
      return
    }
    const others = getAvailableModels().slice(5)
    if (others.length === 0) {
      setLlmMoreModelsCardSelected(false)
      return
    }
    const v = (formData.llm_model_version || '').trim()
    if (v && others.some((m) => m.model_name === v)) {
      setLlmMoreModelsCardSelected(true)
    } else {
      setLlmMoreModelsCardSelected(false)
    }
  }, [
    currentQuestionIndex,
    availableModels,
    loadingModels,
    formData.llm_model_version,
    formData.technology_partner,
    partners,
    otherRadioSelected,
    questions,
  ])

  // Charger les partenaires au démarrage
  useEffect(() => {
    if (mounted && user) {
      fetchPartners()
    }
  }, [mounted, user])

  // Mettre à jour l'ID du partenaire quand le partenaire technologique change
  // Les modèles seront chargés lors du clic sur "Suivant" pour éviter les re-renders
  useEffect(() => {
    const selectedPartnerName = typeof formData.technology_partner === 'string' ? formData.technology_partner.trim() : ''
    if (selectedPartnerName) {
      // Trouver le provider correspondant
      const provider = partners.find(p => p.name === selectedPartnerName)
      if (provider) {
        setFormData(prev => ({ ...prev, technology_partner_id: provider.id }))
        // Les modèles seront chargés dans handleNext() pour éviter le lag
      } else {
        // Partenaire personnalisé (option "Autre")
        setFormData(prev => ({ ...prev, technology_partner_id: undefined }))
        // Vider uniquement pour les partenaires personnalisés
        setAvailableModels([])
      }
    } else {
      // Vider uniquement si aucun partenaire n'est sélectionné
      setFormData(prev => ({ ...prev, technology_partner_id: undefined }))
      setAvailableModels([])
    }
  }, [formData.technology_partner, partners])

  const fetchCompany = async () => {
    try {
      if (!session?.access_token || !companyId) return

      const response = await api.get(`/api/companies/${companyId}`)

      if (response.status === 404) {
        router.push('/dashboard/registries')
        return
      } else if (response.data) {
        setCompany(response.data)
      }
    } catch (error) {
      console.error('Error fetching company:', error)
      router.push('/dashboard/registries')
    }
  }

  // Fonction de génération automatique avec Mistral AI
  const generateDescriptionWithAI = async () => {
    try {
      setIsGeneratingDescription(true)
      setError('')

      // Préparer les données avec les informations de l'entreprise
      const dataToSend = {
        ...formData,
        company_name: company?.name,
        company_industry: company?.industry,
        company_city: company?.city,
        company_country: company?.country
      }

      const response = await fetch('/api/mistral/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData: dataToSend })
      })

      if (!response.ok) {
        let payload: { error?: string; details?: string } = {}
        try {
          payload = await response.json()
        } catch {
          /* réponse non-JSON */
        }
        const message =
          payload.details ||
          payload.error ||
          `Erreur serveur (${response.status})`
        throw new Error(message)
      }

      const data = await response.json()
      setGeneratedDescription(data.description)
      setShowGeneratedDescription(true)

      // Pré-remplir le champ description
      setFormData(prev => ({
        ...prev,
        description: data.description
      }))
    } catch (error) {
      console.error('Erreur génération:', error)
      const technical =
        error instanceof Error ? error.message : ''
      const showTechnical =
        process.env.NODE_ENV === 'development' && Boolean(technical)
      setError(
        showTechnical
          ? technical
          : 'Impossible de générer la description automatiquement. Veuillez la saisir manuellement.'
      )
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const validateCurrentQuestion = () => {
    const value = formData[currentQuestion.id]

    // For radio questions (including technology partner and llm model), check if a value is selected
    if (currentQuestion.type === 'radio' && (currentQuestion.id === 'technology_partner' || currentQuestion.id === 'llm_model_version')) {
      // Special case for LLM models: skip validation if no models are available and no partner selected
      if (currentQuestion.id === 'llm_model_version' && (!formData.technology_partner || !(typeof formData.technology_partner === 'string' ? formData.technology_partner.trim() : formData.technology_partner))) {
        return true // Allow skipping if no partner selected
      }

      const valueStr = typeof value === 'string' ? value : String(value)
      if (!value || !valueStr.trim()) {
        setError('Veuillez sélectionner une option')
        return false
      }
    } else if (currentQuestion.type === 'text' && currentQuestion.id === 'llm_model_version') {
      // Special validation for custom LLM model text input
      const valueStr = typeof value === 'string' ? value : String(value)
      if (!value || !valueStr.trim()) {
        setError('Veuillez saisir le nom du modèle utilisé')
        return false
      }
    } else if (currentQuestion.type === 'countries') {
      // For countries selection, check if at least one country is selected
      if (selectedCountries.length === 0) {
        setError('Veuillez sélectionner au moins un pays')
        return false
      }
    } else if (
      currentQuestion.id === 'deployment_date' &&
      currentQuestion.type === 'deployment_phase_and_date'
    ) {
      if (!formData.deployment_phase?.trim()) {
        setError('Sélectionnez une phase de déploiement.')
        return false
      }
      if (!formData.deployment_date?.trim()) {
        setError('Sélectionnez une date.')
        return false
      }
      const dateCheck = validateDeploymentDateFlexible(formData.deployment_date)
      if (!dateCheck.isValid) {
        setError(dateCheck.error || 'Date invalide.')
        return false
      }
    } else {
      // For other question types (text, textarea, etc.)
      const valueStr = typeof value === 'string' ? value : String(value)
      if (!value || !valueStr.trim()) {
        setError('Cette réponse est requise')
        return false
      }
    }

    setError('')
    return true
  }

  const handleNext = async () => {
    if (!validateCurrentQuestion()) return

    setIsNextNavigating(true)
    try {
      // Si on est à la question "technology_partner" (question 4), charger les modèles avant de continuer
      if (currentQuestion.id === 'technology_partner' && formData.technology_partner_id) {
        try {
          setError('')
          await fetchAvailableModels(formData.technology_partner_id)
        } catch (error) {
          console.error('Erreur chargement modèles:', error)
          setError('Impossible de charger les modèles. Veuillez réessayer.')
          return
        }
      }

      if (isLastQuestion) {
        await handleSubmit()
      } else {
        setCurrentQuestionIndex(prev => prev + 1)
        setOtherRadioValue('')
        setOtherRadioSelected(false)
        setLlmMoreModelsCardSelected(false)
        if (currentQuestion.type === 'countries') {
          setSelectedCountries([])
        }
      }
    } finally {
      setIsNextNavigating(false)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1)
      setError('')
      // Reset other radio value and countries selection when moving to previous question
      setOtherRadioValue('')
      setOtherRadioSelected(false)
      if (currentQuestion.type === 'countries') {
        setSelectedCountries([])
      }
    }
  }

  const handleInviteClick = () => {
    setIsInviteModalOpen(true)
  }

  const handleInvite = async (data: { email: string; firstName: string; lastName: string }) => {
    if (!session?.access_token || !companyId) {
      throw new Error('Non authentifié ou registre non sélectionné')
    }
    const response = await fetch(`/api/companies/${companyId}/collaborators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erreur lors de l'invitation")
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      // Déterminer le primary_model_id à partir du modèle sélectionné
      let primary_model_id = null
      if (formData.llm_model_version && !isCustomTechnologyPartner()) {
        const modelVersionStr = typeof formData.llm_model_version === 'string' ? formData.llm_model_version.trim() : String(formData.llm_model_version)
        primary_model_id = findModelId(modelVersionStr)
      }

      const deploymentCountriesArray = normalizeDeploymentCountriesToArray(
        formData.deployment_countries
      )

      // Log des données à envoyer
      const payload = {
        name: formData.name,
        deployment_phase: formData.deployment_phase.trim() || null,
        deployment_date: formData.deployment_date,
        responsible_service: formData.responsible_service,
        technology_partner: formData.technology_partner,
        technology_partner_id: formData.technology_partner_id, // Ajouter l'ID du partenaire si disponible
        llm_model_version: formData.llm_model_version,
        primary_model_id, // Ajouter l'ID du modèle principal
        ai_category: formData.ai_category,
        system_type: formData.system_type,
        deployment_countries: deploymentCountriesArray,
        description: formData.description,
        status: 'draft',
        company_id: companyId
      }

      console.log('=== DEBUG: Soumission du use case ===')
      console.log('Payload complet:', payload)
      console.log('Company ID:', companyId)
      console.log('FormData actuel:', formData)
      console.log('Available models:', availableModels)
      console.log('Primary model ID trouvée:', primary_model_id)

      const response = await api.post('/api/usecases', payload)

      console.log('Réponse du serveur:', response)
      console.log('Status:', response.status)
      console.log('Data:', response.data)

      // Gérer les erreurs HTTP (useApiCall ne lance pas d'exception)
      if (response.status >= 400) {
        console.error('=== ERREUR HTTP lors de la création du use case ===')
        console.error('Status:', response.status)
        console.error('Data:', response.data)

        let errorMessage = 'Erreur lors de la création du cas d\'usage'
        const errorCode = response.data?.code

        if (errorCode === 'PLAN_LIMIT_REACHED') {
          trackLimitReached('usecases')
          const limit = response.data?.limit || 3
          const current = response.data?.current || 0
          errorMessage = `Vous avez atteint la limite de ${limit} cas d'usage pour ce registre (${current}/${limit}). Mettez à niveau votre plan pour en créer davantage.`
        } else if (errorCode === 'ACCESS_DENIED') {
          errorMessage = 'Vous n\'avez pas les droits pour créer un cas d\'usage dans ce registre.'
        } else if (response.status === 401) {
          errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.'
        } else {
          errorMessage = response.data?.error || response.error || errorMessage
        }

        setError(errorMessage)
        return
      }

      if (response.data?.id) {
        console.log('Redirection vers:', useCaseRoutes.selectPath(response.data.id))
        if (companyId && formData.ai_category) {
          trackUseCaseCreation(companyId, formData.ai_category)
        }
        router.push(useCaseRoutes.selectPath(response.data.id))
      }
    } catch (error: any) {
      console.error('=== ERREUR lors de la création du use case ===')
      console.error('Type d\'erreur:', error?.name)
      console.error('Message:', error?.message)
      console.error('Stack trace:', error?.stack)

      setError(error?.message || 'Erreur lors de la création du cas d\'usage')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, [currentQuestion.id]: value }))
    if (error) {
      setError('')
    }
  }

  const handleCountrySelect = (countryCode: string) => {
    const newSelectedCountries = [...selectedCountries]
    const index = newSelectedCountries.indexOf(countryCode)

    if (index > -1) {
      // Remove country if already selected
      newSelectedCountries.splice(index, 1)
    } else {
      // Add country if not selected
      newSelectedCountries.push(countryCode)
    }

    setSelectedCountries(newSelectedCountries)

    // Convertir les codes ISO en noms français avant de mettre à jour formData
    const countryNames = newSelectedCountries
      .map(code => isoToCountryName[code.toLowerCase()] || code)
      .filter(name => name) // Filtrer les noms non trouvés

    handleInputChange(countryNames.join(', '))
  }

  const handleAddEU = () => {
    const selectable = new Set(DEPLOYMENT_SELECTABLE_CODES)
    const euCodesPresent = EU_COUNTRIES.filter((c) => selectable.has(c))
    const newSelectedCountries = [...new Set([...selectedCountries, ...euCodesPresent])]
    setSelectedCountries(newSelectedCountries)
    const countryNames = newSelectedCountries
      .map((code) => isoToCountryName[code.toLowerCase()] || code)
      .filter(Boolean)
    handleInputChange(countryNames.join(', '))
  }

  const removeCountry = (countryCode: string) => {
    const newSelectedCountries = selectedCountries.filter(country => country !== countryCode)
    setSelectedCountries(newSelectedCountries)

    // Convertir les codes ISO en noms français avant de mettre à jour formData
    const countryNames = newSelectedCountries
      .map(code => isoToCountryName[code.toLowerCase()] || code)
      .filter(name => name) // Filtrer les noms non trouvés

    handleInputChange(countryNames.join(', '))
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentQuestion.type !== 'textarea') {
      e.preventDefault()
      handleNext()
    }
  }

  // Early return for SSR/initial render
  if (typeof window === 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
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
          <p className="mt-4 text-gray-600">Chargement de l&apos;entreprise...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 font-sans">
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
              <Image
                src="/icons_dash/technology.png"
                alt="Icône technologie"
                width={32}
                height={32}
                className="h-8 w-8"
              />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
            {currentQuestionIndex > 0 && formData.name
              ? formData.name
              : "Nouveau cas d'usage IA"}
          </h1>
          <p className="text-gray-600">
            Registre : {company.name}
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

          {currentQuestion.id !== 'name' && (
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h2
                  id={
                    currentQuestion.id === 'responsible_service'
                      ? responsibleServiceHeadingId
                      : currentQuestion.id === 'technology_partner'
                        ? technologyPartnerHeadingId
                        : currentQuestion.id === 'llm_model_version' && !isCustomTechnologyPartner()
                          ? llmModelHeadingId
                          : currentQuestion.id === 'ai_category'
                            ? aiCategoryHeadingId
                            : currentQuestion.id === 'system_type'
                              ? systemTypeHeadingId
                              : currentQuestion.id === 'deployment_countries'
                                ? deploymentCountriesHeadingId
                                : currentQuestion.id === 'description'
                                  ? descriptionHeadingId
                                  : undefined
                  }
                  className="text-xl sm:text-2xl font-semibold text-gray-900 mb-0"
                >
                  {currentQuestion.id === 'llm_model_version' && !isCustomTechnologyPartner()
                    ? (() => {
                        const pn =
                          typeof formData.technology_partner === 'string'
                            ? formData.technology_partner.trim()
                            : ''
                        return pn
                          ? `Quel modèle de ${pn} utilisez-vous ?`
                          : 'Quel modèle IA utilisez-vous ?'
                      })()
                    : currentQuestion.id === 'system_type'
                      ? 'Système autonome ou produit ?'
                      : currentQuestion.id === 'deployment_countries'
                        ? 'Dans quels pays ce système sera-t-il déployé ?'
                        : currentQuestion.id === 'description'
                          ? 'Comment décririez-vous ce système IA ?'
                          : currentQuestion.question}
                </h2>
                {currentQuestion.tooltip &&
                  currentQuestion.id !== 'responsible_service' &&
                  currentQuestion.id !== 'technology_partner' &&
                  currentQuestion.id !== 'llm_model_version' &&
                  currentQuestion.id !== 'system_type' &&
                  currentQuestion.id !== 'ai_category' &&
                  currentQuestion.id !== 'deployment_countries' &&
                  currentQuestion.id !== 'description' && (
                  <Tooltip
                    title={currentQuestion.tooltip.title}
                    shortContent={currentQuestion.tooltip.shortContent}
                    fullContent={currentQuestion.tooltip.fullContent}
                    icon={currentQuestion.tooltip.icon}
                    type="question"
                  />
                )}
              </div>
              {currentQuestion.id === 'responsible_service' && (
                <p className="text-sm text-gray-600 mb-6">
                  Identifiez le département responsable du pilotage opérationnel de ce système.
                </p>
              )}
              {currentQuestion.id === 'technology_partner' && (
                <p className="text-sm text-gray-600 mb-6">
                  Sélectionnez l&apos;éditeur principal de la technologie IA utilisée.
                </p>
              )}
              {currentQuestion.id === 'system_type' && (
                <p className="text-sm text-gray-600 mb-6">
                  Votre IA est-elle essentielle à la sécurité d&apos;un produit matériel, ou
                  s&apos;agit-il d&apos;un logiciel indépendant utilisé pour sa propre finalité ?
                </p>
              )}
              {currentQuestion.id === 'deployment_countries' && (
                <p className="text-sm text-gray-600 mb-6">
                  La zone géographique détermine les cadres réglementaires applicables (ex: RGPD, AI Act).
                </p>
              )}
              {currentQuestion.id === 'description' && (
                <p className="text-sm text-gray-600 mb-6">
                  Cette description servira de base à votre registre de conformité. Soyez factuel ou laissez
                  notre IA la rédiger pour vous.
                </p>
              )}
              {currentQuestion.maxLength && (
                <p className="text-sm text-gray-500">
                  Maximum {currentQuestion.maxLength} caractères
                </p>
              )}
            </div>
          )}

          {/* Input based on question type — étape 1 : nom du système IA */}
          {currentQuestion.type === 'text' && currentQuestion.id === 'name' && (
            <div>
              <label
                htmlFor="create-use-case-name-input"
                className="block text-base sm:text-lg font-medium text-gray-900 mb-2"
              >
                Comment souhaitez-vous nommer ce système IA ?
              </label>
              <input
                id="create-use-case-name-input"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={50}
                aria-describedby="naming-hint"
                className={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 placeholder-gray-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus:border-[#0080A3] ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={currentQuestion.placeholder}
                autoFocus
              />
              <div id="naming-hint" className="text-sm text-gray-600 mt-2">
                <p>Soyez précis sur sa finalité pour optimiser l&apos;analyse juridique.</p>
                <span className="block mt-2 text-red-600">
                  <X size={16} className="inline text-red-600 mr-1" aria-hidden="true" />
                  À éviter : &apos;IA Production&apos;
                </span>
                <span className="block mt-1 text-teal-700">
                  <Check size={16} className="inline text-teal-600 mr-1" aria-hidden="true" />
                  Idéal : &apos;Système prédictif des pannes de montage&apos;
                </span>
              </div>
            </div>
          )}

          {currentQuestion.type === 'deployment_phase_and_date' &&
            currentQuestion.id === 'deployment_date' && (
              <div className="space-y-6">
                <p
                  id={deploymentPhaseHeadingId}
                  className="text-base sm:text-lg font-medium text-gray-900"
                >
                  Où en est le déploiement de ce système IA ?
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby={deploymentPhaseHeadingId}
                  className="grid grid-cols-1 gap-3"
                >
                  {DEPLOYMENT_PHASE_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`group flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all duration-200 ${
                        formData.deployment_phase === option
                          ? 'border-[#0080A3] bg-[#0080A3]/5'
                          : 'border-gray-200 hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="mt-1 flex h-6 items-center">
                          <input
                            type="radio"
                            name="deployment_phase"
                            value={option}
                            checked={formData.deployment_phase === option}
                            onChange={() => {
                              setFormData((prev) => ({ ...prev, deployment_phase: option }))
                              if (error) setError('')
                            }}
                            className="h-5 w-5 border-2 border-gray-300 text-[#0080A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus:ring-offset-0"
                          />
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{option}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <div>
                  <label
                    htmlFor="create-use-case-deployment-date"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    {getDeploymentDateFieldLabel(formData.deployment_phase)}
                  </label>
                  <input
                    id="create-use-case-deployment-date"
                    type="date"
                    value={formData.deployment_date}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, deployment_date: e.target.value }))
                      if (error) setError('')
                    }}
                    onKeyPress={handleKeyPress}
                    className={`w-full rounded-lg border px-4 py-3 text-lg text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] focus:border-[#0080A3] ${
                      error ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoFocus
                  />
                </div>
              </div>
            )}

          {currentQuestion.type === 'select' && (
            <div className="space-y-4">
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                <div className="space-y-3">
                  {/* Affichage spécial pour la question responsible_service avec 2 colonnes */}
                  {currentQuestion.id === 'responsible_service' ? (
                    <div
                      role="radiogroup"
                      aria-labelledby={responsibleServiceHeadingId}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    >
                      {(currentQuestion.options as string[]).map((option, index) => {
                        const Icon = RESPONSIBLE_SERVICE_ICONS[option] ?? MoreHorizontal
                        const selected = formData[currentQuestion.id] === option
                        return (
                          <label
                            key={index}
                            className="block cursor-pointer rounded-lg"
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option}
                              checked={selected}
                              onChange={() => handleInputChange(option)}
                              className="peer sr-only"
                            />
                            <div
                              className={`flex items-center gap-3 rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                selected
                                  ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                  : 'border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                              }`}
                            >
                              <Icon
                                size={20}
                                className="shrink-0 text-[#0080A3]"
                                aria-hidden
                              />
                              <span
                                className={`min-w-0 text-left text-base text-gray-900 ${
                                  selected ? 'font-medium' : ''
                                }`}
                              >
                                {option}
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    /* Affichage normal pour les autres questions select */
                    (currentQuestion.options as string[]).map((option, index) => (
                      <label
                        key={index}
                        className={`group flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          formData[currentQuestion.id] === option
                            ? 'border-[#0080A3] bg-[#0080A3]/5'
                            : 'border-gray-200 hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center h-6 mt-1">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option}
                              checked={formData[currentQuestion.id] === option}
                              onChange={() => handleInputChange(option)}
                              className="h-5 w-5 text-[#0080A3] border-2 border-gray-300 focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-semibold text-gray-900">
                              {option}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'textarea' && (
            <div className="space-y-4">
              {currentQuestion.id === 'description' && (
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={generateDescriptionWithAI}
                    disabled={isGeneratingDescription || !formData.name || !formData.ai_category}
                    aria-busy={isGeneratingDescription ? true : undefined}
                    className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} className="shrink-0" aria-hidden />
                        Rédiger pour moi (Mistral AI)
                      </>
                    )}
                  </button>
                </div>
              )}

              {currentQuestion.id === 'description' && showGeneratedDescription && generatedDescription && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center text-sm font-semibold text-blue-800">
                      <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                      Description générée par Mistral AI
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowGeneratedDescription(false)}
                      className="text-blue-600 hover:text-blue-800"
                      aria-label="Masquer l’aperçu de la description générée"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-blue-700">{generatedDescription}</p>
                  <div className="mt-3 text-xs text-blue-600">
                    Cette description a été pré-remplie dans le champ ci-dessous. Vous pouvez la modifier selon
                    vos besoins.
                  </div>
                </div>
              )}

              <textarea
                id="create-use-case-description"
                aria-labelledby={
                  currentQuestion.id === 'description' ? descriptionHeadingId : undefined
                }
                value={formData[currentQuestion.id]}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`min-h-[160px] w-full resize-y rounded-lg border bg-white p-4 text-gray-900 transition-all focus:border-[#0080A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3] ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={
                  currentQuestion.id === 'description'
                    ? "Ex: Ce système analyse l'historique des tickets clients pour suggérer des réponses pré-rédigées aux agents du SAV, afin de réduire le temps de traitement."
                    : currentQuestion.placeholder
                }
                autoFocus
              />
            </div>
          )}


          {currentQuestion.type === 'radio' && (
            <div className="space-y-4">
              {/* Loading state for technology partners */}
              {currentQuestion.id === 'technology_partner' && loadingPartners && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                  <p className="text-blue-700">Chargement des partenaires technologiques...</p>
                </div>
              )}

              {/* Loading state for models */}
              {currentQuestion.id === 'llm_model_version' && loadingModels && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                  <p className="text-blue-700">Chargement des modèles disponibles...</p>
                </div>
              )}

              {/* Custom partner info message for LLM models */}
              {currentQuestion.id === 'llm_model_version' && !loadingModels && isCustomTechnologyPartner() && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <HelpCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Partenaire technologique personnalisé
                  </h3>
                  <p className="text-blue-700">
                    Puisque vous avez sélectionné un partenaire personnalisé ({formData.technology_partner}), veuillez saisir manuellement le nom du modèle utilisé.
                  </p>
                </div>
              )}

              {/* No partners selected message for LLM models - only show if no partner at all */}
              {currentQuestion.id === 'llm_model_version' && !loadingModels && (!formData.technology_partner || !formData.technology_partner.trim()) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">
                    Aucun partenaire technologique sélectionné
                  </h3>
                  <p className="text-amber-700 mb-4">
                    Veuillez d'abord sélectionner un partenaire technologique pour continuer.
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

              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && !loadingPartners && !loadingModels && (
                <>
                  {currentQuestion.id === 'technology_partner' ? (
                    <div
                      role="radiogroup"
                      aria-labelledby={technologyPartnerHeadingId}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    >
                      {(
                        currentQuestion.options as {
                          label: string
                          examples: string[]
                          tooltip?: {
                            title: string
                            shortContent: string
                            fullContent?: string
                            icon?: string
                          }
                          modelData?: ModelData
                        }[]
                      ).map((option, index) => {
                        const selected = formData.technology_partner === option.label
                        const tooltipData = getProviderTooltip(option.label)
                        return (
                          <label
                            key={`${option.label}-${index}`}
                            className="block cursor-pointer rounded-lg"
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option.label}
                              checked={selected}
                              onChange={() => {
                                handleInputChange(option.label)
                                setOtherRadioValue('')
                                setOtherRadioSelected(false)
                              }}
                              className="peer sr-only"
                            />
                            <div
                              className={`flex items-center justify-between rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                selected
                                  ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                  : 'cursor-pointer border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                                <Image
                                  src={getProviderIcon(option.label)}
                                  alt={`Logo ${option.label}`}
                                  width={24}
                                  height={24}
                                  className="h-6 w-6 shrink-0 object-contain"
                                />
                                <span
                                  className={`truncate text-base text-gray-900 ${
                                    selected ? 'font-medium' : ''
                                  }`}
                                >
                                  {option.label}
                                </span>
                              </div>
                              {tooltipData ? (
                                <Tooltip
                                  title={tooltipData.title}
                                  shortContent={tooltipData.shortContent}
                                  fullContent={tooltipData.fullContent}
                                  icon={tooltipData.icon}
                                  rank={tooltipData.rank}
                                  rankText={tooltipData.rankText}
                                  type="answer"
                                  position="auto"
                                  triggerVariant="info"
                                  isolateSelection
                                />
                              ) : (
                                <span className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : currentQuestion.id === 'llm_model_version' && !isCustomTechnologyPartner() ? (
                    <div className="space-y-4">
                      <div
                        role="radiogroup"
                        aria-labelledby={llmModelHeadingId}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                      >
                        {llmTopModels.map((model) => {
                          const selected =
                            !llmMoreModelsCardSelected &&
                            !otherRadioSelected &&
                            formData.llm_model_version === model.model_name
                          const hasInfo = Boolean(model.notes_short || model.notes_long)
                          return (
                            <label key={model.id} className="block cursor-pointer rounded-lg">
                              <input
                                type="radio"
                                name={currentQuestion.id}
                                value={model.model_name}
                                checked={selected}
                                onChange={() => {
                                  setLlmMoreModelsCardSelected(false)
                                  setOtherRadioSelected(false)
                                  setOtherRadioValue('')
                                  handleInputChange(model.model_name)
                                }}
                                className="peer sr-only"
                              />
                              <div
                                className={`flex items-center justify-between rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                  selected
                                    ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                    : 'cursor-pointer border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                                  <span
                                    className={`truncate text-base text-gray-900 ${
                                      selected ? 'font-medium' : ''
                                    }`}
                                  >
                                    {model.model_name}
                                  </span>
                                </div>
                                {hasInfo ? (
                                  <Tooltip
                                    title={model.model_name}
                                    shortContent={model.notes_short || model.model_name}
                                    fullContent={model.notes_long}
                                    type="answer"
                                    position="auto"
                                    triggerVariant="info"
                                    isolateSelection
                                  />
                                ) : (
                                  <span className="h-4 w-4 shrink-0" aria-hidden />
                                )}
                              </div>
                            </label>
                          )
                        })}
                        {llmOtherModels.length > 0 && (
                          <label className="block cursor-pointer rounded-lg">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={LLM_MORE_MODELS_CARD_RADIO}
                              checked={llmMoreModelsCardSelected}
                              onChange={() => {
                                setLlmMoreModelsCardSelected(true)
                                setOtherRadioSelected(false)
                                setOtherRadioValue('')
                                const first = llmOtherModels[0]
                                if (first) handleInputChange(first.model_name)
                              }}
                              className="peer sr-only"
                            />
                            <div
                              className={`flex items-center justify-between rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                llmMoreModelsCardSelected
                                  ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                  : 'cursor-pointer border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <MoreHorizontal
                                  size={24}
                                  className="shrink-0 text-[#0080A3]"
                                  aria-hidden="true"
                                />
                                <span
                                  className={`text-base text-gray-900 ${
                                    llmMoreModelsCardSelected ? 'font-medium' : ''
                                  }`}
                                >
                                  Autre modèle...
                                </span>
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                      {llmOtherModels.length > 0 && llmMoreModelsCardSelected && (
                        <select
                          aria-label="Sélectionnez un autre modèle dans la liste"
                          className="mt-4 w-full border border-gray-300 rounded-lg bg-white p-4 text-gray-900 transition-all focus:border-[#0080A3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3]"
                          value={
                            llmOtherModels.some((m) => m.model_name === formData.llm_model_version)
                              ? formData.llm_model_version
                              : (llmOtherModels[0]?.model_name ?? '')
                          }
                          onChange={(e) => handleInputChange(e.target.value)}
                        >
                          {llmOtherModels.map((m) => (
                            <option key={m.id} value={m.model_name}>
                              {m.model_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : currentQuestion.id === 'ai_category' ? (
                    <div
                      role="radiogroup"
                      aria-labelledby={aiCategoryHeadingId}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    >
                      {(
                        currentQuestion.options as {
                          label: string
                          examples: string[]
                          tooltip?: {
                            title: string
                            shortContent: string
                            fullContent?: string
                            icon?: string
                          }
                          modelData?: ModelData
                        }[]
                      ).map((option) => {
                        const Icon = AI_CATEGORY_ICONS[option.label] ?? MoreHorizontal
                        const selected = formData.ai_category === option.label
                        return (
                          <label key={option.label} className="block cursor-pointer rounded-lg">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option.label}
                              checked={selected}
                              onChange={() => {
                                handleInputChange(option.label)
                                setOtherRadioValue('')
                                setOtherRadioSelected(false)
                              }}
                              className="peer sr-only"
                            />
                            <div
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                selected
                                  ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                  : 'border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                              }`}
                            >
                              <Icon
                                size={24}
                                className="mt-0.5 shrink-0 text-[#0080A3]"
                                aria-hidden="true"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <span
                                    className={`text-base text-gray-900 ${
                                      selected ? 'font-semibold' : 'font-medium'
                                    }`}
                                  >
                                    {option.label}
                                  </span>
                                  {option.tooltip ? (
                                    <Tooltip
                                      title={option.tooltip.title}
                                      shortContent={option.tooltip.shortContent}
                                      fullContent={option.tooltip.fullContent}
                                      icon={option.tooltip.icon}
                                      type="answer"
                                      position="auto"
                                      triggerVariant="info"
                                      isolateSelection
                                    />
                                  ) : (
                                    <span className="h-4 w-4 shrink-0" aria-hidden />
                                  )}
                                </div>
                                {option.examples.length > 0 && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Exemples : </span>
                                    <span className="text-gray-500">{option.examples.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : currentQuestion.id === 'system_type' ? (
                    <div
                      role="radiogroup"
                      aria-labelledby={systemTypeHeadingId}
                      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                    >
                      {(
                        currentQuestion.options as {
                          label: string
                          examples: string[]
                          tooltip?: {
                            title: string
                            shortContent: string
                            fullContent?: string
                            icon?: string
                          }
                          modelData?: ModelData
                        }[]
                      ).map((option) => {
                        const Icon = option.label === 'Produit' ? Package : Cpu
                        const selected = formData.system_type === option.label
                        const legal = SYSTEM_TYPE_LEGAL_TOOLTIP[option.label]
                        return (
                          <label
                            key={option.label}
                            className="flex h-full min-h-0 cursor-pointer flex-col rounded-lg"
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={option.label}
                              checked={selected}
                              onChange={() => {
                                handleInputChange(option.label)
                                setOtherRadioValue('')
                                setOtherRadioSelected(false)
                              }}
                              className="peer sr-only"
                            />
                            <div
                              className={`flex h-full min-h-0 flex-1 flex-col peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                                selected
                                  ? 'rounded-lg border border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                                  : 'cursor-pointer rounded-lg border border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                              } transition-all`}
                            >
                              <div className="flex flex-1 flex-col gap-3 p-4">
                                <div className="flex items-start gap-3">
                                  <Icon
                                    size={24}
                                    className="mt-0.5 shrink-0 text-[#0080A3]"
                                    aria-hidden="true"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <span
                                        className={`text-base text-gray-900 ${
                                          selected ? 'font-semibold' : 'font-medium'
                                        }`}
                                      >
                                        {option.label}
                                      </span>
                                      {legal ? (
                                        <Tooltip
                                          title={legal.title}
                                          shortContent={legal.shortContent}
                                          type="answer"
                                          position="auto"
                                          triggerVariant="info"
                                          isolateSelection
                                        />
                                      ) : (
                                        <span className="h-4 w-4 shrink-0" aria-hidden />
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {option.examples.length > 0 && (
                                  <div className="mt-auto text-sm text-gray-600">
                                    <span className="font-medium">Exemples : </span>
                                    <span className="text-gray-500">{option.examples.join(', ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : null}

                  {/* Other Option for questions that have hasOtherOption */}
                  {currentQuestion.hasOtherOption && currentQuestion.id === 'technology_partner' && (
                    <div className="space-y-3">
                      <label className="block cursor-pointer rounded-lg">
                        <input
                          type="radio"
                          name={currentQuestion.id}
                          value="Autre"
                          checked={otherRadioSelected}
                          onChange={() => {
                            setOtherRadioSelected(true)
                            setTimeout(() => {
                              const input = document.getElementById(
                                `other-input-${currentQuestion.id}`
                              )
                              if (input) input.focus()
                            }, 100)
                          }}
                          className="peer sr-only"
                        />
                        <div
                          className={`flex items-center justify-between rounded-lg border p-4 transition-all peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0080A3] ${
                            otherRadioSelected
                              ? 'border-[#0080A3] bg-[#0080A3]/5 ring-1 ring-[#0080A3]'
                              : 'cursor-pointer border-gray-300 bg-white hover:border-[#0080A3]/50 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <MoreHorizontal
                              size={24}
                              className="shrink-0 text-[#0080A3]"
                              aria-hidden="true"
                            />
                            <span
                              className={`text-base text-gray-900 ${
                                otherRadioSelected ? 'font-medium' : ''
                              }`}
                            >
                              Autre
                            </span>
                          </div>
                        </div>
                      </label>

                      {otherRadioSelected && (
                        <div className="ml-2 animate-fadeIn">
                          <input
                            id={`other-input-${currentQuestion.id}`}
                            type="text"
                            value={otherRadioValue}
                            onChange={(e) => {
                              setOtherRadioValue(e.target.value)
                              handleInputChange(e.target.value)
                            }}
                            onKeyPress={handleKeyPress}
                            className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-opacity-20"
                            placeholder="Spécifiez le partenaire technologique..."
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {currentQuestion.hasOtherOption && currentQuestion.id !== 'technology_partner' && (
                    <div className="space-y-3">
                      <label
                        className={`group flex flex-col cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                          otherRadioSelected
                            ? 'border-[#0080A3] bg-[#0080A3]/5'
                            : 'border-gray-200 hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="mt-1 flex h-6 items-center">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value="Autre"
                              checked={otherRadioSelected}
                              onChange={() => {
                                setOtherRadioSelected(true)
                                if (currentQuestion.id === 'llm_model_version') {
                                  setLlmMoreModelsCardSelected(false)
                                }
                                setTimeout(() => {
                                  const input = document.getElementById(
                                    `other-input-${currentQuestion.id}`
                                  )
                                  if (input) input.focus()
                                }, 100)
                              }}
                              className="h-5 w-5 border-2 border-gray-300 text-[#0080A3] focus:ring-2 focus:ring-[#0080A3] focus:ring-offset-0"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 text-lg font-semibold text-gray-900">Autre</div>
                          </div>
                        </div>
                      </label>

                      {otherRadioSelected && (
                        <div className="ml-2 animate-fadeIn">
                          <input
                            id={`other-input-${currentQuestion.id}`}
                            type="text"
                            value={otherRadioValue}
                            onChange={(e) => {
                              setOtherRadioValue(e.target.value)
                              handleInputChange(e.target.value)
                            }}
                            onKeyPress={handleKeyPress}
                            className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus:ring-opacity-20"
                            placeholder="Spécifiez votre réponse..."
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentQuestion.type === 'countries' && (
            <div className="space-y-6" aria-labelledby={deploymentCountriesHeadingId}>
              {/* Country Selector */}
              <div className="relative">
                <ReactFlagsSelect
                  countries={DEPLOYMENT_SELECTABLE_CODES}
                  selected=""
                  onSelect={(code) => handleCountrySelect(code)}
                  searchable
                  placeholder="Rechercher et sélectionner un pays..."
                  className="w-full"
                  selectButtonClassName={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:border-[#0080A3] focus:outline-none focus:ring-2 focus:ring-[#0080A3] focus-visible:ring-2 focus-visible:ring-[#0080A3] transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300'
                  }`}
                  showSelectedLabel={false}
                  showOptionLabel={true}
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={handleAddEU}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200"
                >
                  🇪🇺 Ajouter l&apos;Union Européenne
                </button>
              </div>

              {/* Selected Countries Display */}
              {selectedCountries.length > 0 && (
                <div className="rounded-xl border-2 border-[#0080A3] bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center text-lg font-semibold text-gray-900">
                      <CheckCircle className="mr-2 h-5 w-5 text-[#0080A3]" />
                      Pays sélectionnés
                    </h3>
                    <span className="rounded-full bg-[#0080A3] px-3 py-1 text-sm font-medium text-white">
                      {selectedCountries.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedCountries.map((countryCode) => {
                      const countryName =
                        new Intl.DisplayNames(['fr'], { type: 'region' }).of(countryCode) ??
                        countryCode
                      return (
                        <span
                          key={countryCode}
                          className="inline-flex items-center gap-2 rounded-full border border-[#0080A3]/20 bg-[#0080A3]/10 px-3 py-1.5 text-sm font-medium text-[#0080A3]"
                        >
                          <img
                            src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
                            alt=""
                            className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                            width={20}
                            height={14}
                          />
                          {countryName}
                          <button
                            type="button"
                            onClick={() => removeCountry(countryCode)}
                            className="rounded-full p-0.5 transition-colors hover:bg-[#0080A3]/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0080A3]"
                            aria-label={`Supprimer ${countryName}`}
                          >
                            <X size={14} aria-hidden />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {selectedCountries.length === 0 && (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <div className="flex flex-col items-center">
                    <div className="bg-gray-100 p-3 rounded-full mb-4">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun pays sélectionné
                    </h3>
                    <p className="text-gray-600 max-w-sm">
                      Utilisez le champ de recherche ci-dessus pour trouver et sélectionner les pays où votre cas d'usage sera déployé.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 w-full mt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {!isFirstQuestion && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </button>
            )}
            {isOwner && companyId && (
              <button
                type="button"
                onClick={handleInviteClick}
                className="flex items-center justify-center gap-2 px-4 py-2 text-[#0080A3] border border-[#0080A3] rounded-md hover:bg-[#0080A3]/10 transition-colors font-medium"
              >
                <UserPlus size={18} aria-hidden />
                Inviter un collaborateur
              </button>
            )}
          </div>
          <div className="flex justify-end sm:justify-end">
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting || isNextNavigating}
              aria-busy={submitting || isNextNavigating ? true : undefined}
              className="flex min-w-[140px] w-full items-center justify-center rounded-lg bg-[#0080A3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#006280] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting && isLastQuestion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-white" aria-hidden />
                  Création en cours...
                </>
              ) : isNextNavigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-white" aria-hidden />
                  Chargement...
                </>
              ) : isLastQuestion ? (
                <>
                  <Save className="h-4 w-4 mr-2" aria-hidden />
                  {"Créer le cas d'usage"}
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-2" aria-hidden />
                </>
              )}
            </button>
          </div>
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
                    {q.id === 'deployment_date'
                      ? [formData.deployment_phase, formData.deployment_date].filter(Boolean).join(' — ') ||
                        '—'
                      : formData[q.id]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <InviteCollaboratorModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        scope="registry"
      />
    </div>
  )
}

export default function CreateUseCasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <CreateUseCasePageContent />
    </Suspense>
  )
}
