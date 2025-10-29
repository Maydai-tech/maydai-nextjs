'use client'

import { useEffect, useState, Suspense } from 'react'
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
  Sparkles
} from 'lucide-react'
import Image from 'next/image'
import { getProviderIcon } from '@/lib/provider-icons'
import Tooltip from '@/components/Tooltip'

// Force dynamic rendering to prevent prerender errors
export const dynamic = 'force-dynamic'

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
}

interface ModelData {
  id: string
  model_name: string
  model_type?: string
  version?: string
}

interface FormData {
  name: string
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
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'date' | 'countries'
  options?: string[] | { label: string; examples: string[]; tooltip?: { title: string; shortContent: string; fullContent?: string; icon?: string } }[]
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

function NewUseCasePageContent() {
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
    deployment_countries: '',
    description: ''
  })
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [partners, setPartners] = useState<ModelProvider[]>([])
  const [loadingPartners, setLoadingPartners] = useState(false)
  const [availableModels, setAvailableModels] = useState<ModelData[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [otherRadioValue, setOtherRadioValue] = useState('')
  const [otherRadioSelected, setOtherRadioSelected] = useState(false)
  const api = useApiCall()

  // Données des infobulles pour chaque partenaire technologique
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

  // États pour la génération automatique avec Mistral AI
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [generatedDescription, setGeneratedDescription] = useState('')
  const [showGeneratedDescription, setShowGeneratedDescription] = useState(false)

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

  const questions: Question[] = [
    {
      id: 'name',
      question: 'Nom du cas d\'usage IA ?',
      type: 'text',
      placeholder: 'ex: Système IA Anti-Fraude',
      maxLength: 50
    },
    {
      id: 'deployment_date',
      question: 'Date de déploiement passée ou prévue ?',
      type: 'text',
      placeholder: 'DD/MM/YYYY (ex: 15/06/2025)',
      maxLength: 10,
      tooltip: {
        title: 'Pourquoi documenter la date de déploiement ?',
        shortContent: 'Cette question permet d\'améliorer les recommandations de l\'audit du cas d\'usage IA.',
        fullContent: 'Cette question permet d\'améliorer les recommandations de l\'audit du cas d\'usage IA.',
        icon: '💡'
      }
    },
    {
      id: 'responsible_service',
      question: 'Service en charge du cas d\'usage IA ?',
      type: 'select',
      options: [
        'Ressources Humaines (RH)',
        'Communication / Marketing',
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
      ],
      tooltip: {
        title: 'Pourquoi documenter le service responsable ?',
        shortContent: 'Renseignez le service de l\'entreprise responsable du suivi opérationnel du cas d\'usage IA.',
        fullContent: 'Renseignez le service de l\'entreprise responsable du suivi opérationnel du cas d\'usage IA.',
        icon: '💡'
      }
    },
    {
      id: 'technology_partner',
      question: 'Partenaire technologique ?',
      type: 'radio',
      options: partners.map(partner => ({ label: partner.name, examples: [] })), // Liste dynamique convertie en format radio
      hasOtherOption: true,
      tooltip: {
        title: 'Pourquoi suivre le partenaire technologique ?',
        shortContent: 'Documentez le fournisseur de votre modèle IA selon les exigences de l\'IA Act.',
        fullContent: `L'IA Act européen impose des obligations différentes selon votre rôle dans la chaîne de valeur de l'IA.

Traçabilité & Risque : Pour chaque cas d'usage, vous devez documenter l'ensemble du système, y compris le modèle de fondation (GPAI - General Purpose AI) sur lequel il s'appuie.

Obligations Partagées : Les fournisseurs de GPAI (comme Google, OpenAI, Mistral...) ont leurs propres obligations de transparence (documentation technique, instructions d'usage).

Identifier votre partenaire permet à MaydAI de vous aider à centraliser la bonne documentation et à évaluer précisément les risques transférés de leur modèle vers votre cas d'usage.`,
        icon: '💡'
      }
    },
    {
      id: 'llm_model_version',
      question: 'Modèle et version du LLM ?',
      type: 'radio',
      options: [], // Will be populated dynamically based on selected partner
      hasOtherOption: true
    },
    {
      id: 'ai_category',
      question: 'Dans quelle catégorie d\'IA votre cas d\'usage s\'inscrit-il ?',
      type: 'radio',
      options: [
        { 
          label: 'Large Language Model (LLM)', 
          examples: ['ChatGPT', 'Claude', 'Mistral', 'Gemini'],
          tooltip: {
            title: 'Large Language Model (LLM)',
            shortContent: 'Modèles de langage génératifs capables de comprendre et générer du texte.',
            fullContent: 'Les LLM sont entraînés sur d\'immenses corpus de texte. Ils peuvent générer, traduire, résumer du contenu. L\'IA Act classe ces modèles comme GPAI à usage général.',
            icon: '💬'
          }
        },
        { 
          label: 'Vision par ordinateur', 
          examples: ['DALL-E', 'Midjourney'],
          tooltip: {
            title: 'Vision par ordinateur',
            shortContent: 'IA capable d\'analyser, comprendre et générer des images.',
            fullContent: 'La vision par ordinateur permet l\'analyse d\'images, la détection d\'objets, la reconnaissance faciale ou la génération d\'images. Risques spécifiques selon l\'usage.',
            icon: '👁️'
          }
        },
        { 
          label: 'Machine Learning', 
          examples: ['TensorFlow', 'scikit-learn'],
          tooltip: {
            title: 'Machine Learning',
            shortContent: 'Apprentissage automatique pour prédictions et classifications basées sur des données.',
            fullContent: 'Le ML utilise des algorithmes pour apprendre des patterns dans les données et faire des prédictions. Applications variées : scoring, détection d\'anomalies, etc.',
            icon: '📊'
          }
        },
        { 
          label: 'Robotique', 
          examples: ['Boston Dynamics Atlas', 'ASIMO'],
          tooltip: {
            title: 'Robotique',
            shortContent: 'Systèmes physiques intelligents capables d\'interagir avec leur environnement.',
            fullContent: 'La robotique IA combine capteurs, actionneurs et IA pour l\'autonomie. L\'IA Act impose des règles strictes pour les robots en contact avec le public.',
            icon: '🦾'
          }
        },
        { 
          label: 'Systèmes experts', 
          examples: ['MYCIN', 'DENDRAL'],
          tooltip: {
            title: 'Systèmes experts',
            shortContent: 'Systèmes basés sur des règles métier et l\'expertise humaine formalisée.',
            fullContent: 'Les systèmes experts utilisent une base de connaissances et des règles logiques pour simuler le raisonnement d\'un expert. Moins courants aujourd\'hui.',
            icon: '🎓'
          }
        },
        { 
          label: 'Logiciels métiers', 
          examples: ['Salesforce Einstein', 'Adobe Firefly'],
          tooltip: {
            title: 'Logiciels métiers',
            shortContent: 'Applications professionnelles intégrant des fonctionnalités IA.',
            fullContent: 'Logiciels d\'entreprise enrichis par l\'IA (CRM, ERP, outils créatifs). L\'IA est un composant parmi d\'autres fonctionnalités métier.',
            icon: '💼'
          }
        },
        { 
          label: 'Apprentissage / e-learning', 
          examples: ['Didask'],
          tooltip: {
            title: 'Apprentissage / e-learning',
            shortContent: 'Plateformes d\'apprentissage utilisant l\'IA pour personnaliser la formation.',
            fullContent: 'L\'IA adapte les parcours pédagogiques selon les profils et progressions des apprenants. Enjeux de transparence sur les décisions d\'orientation.',
            icon: '📚'
          }
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
          examples: ['Chatbot indépendant', 'Assistant virtuel', 'Système de recommandation autonome'],
          tooltip: {
            title: 'Système autonome',
            shortContent: 'Système automatisé fonctionnant avec différents niveaux d\'autonomie.',
            fullContent: 'Un système automatisé conçu pour fonctionner avec différents niveaux d\'autonomie, capable de déduire des sorties (prédictions, contenus) qui influencent les environnements physiques ou virtuels.',
            icon: '🤖'
          }
        },
        { 
          label: 'Produit', 
          examples: ['Fonctionnalité intégrée', 'Module IA dans une application', 'Composant d\'un service existant'],
          tooltip: {
            title: 'Produit',
            shortContent: 'Système IA intégré comme composant dans un produit physique ou logiciel.',
            fullContent: 'Le système d\'IA peut être intégré en tant que composant dans un produit (physique ou logiciel) soumis à la législation de l\'UE.',
            icon: '📦'
          }
        }
      ]
    },
    {
      id: 'deployment_countries',
      question: 'Dans quels pays le cas d\'usage est-il utilisé ?',
      type: 'countries',
      placeholder: 'Sélectionnez les pays de déploiement...',
      tooltip: {
        title: 'Application territoriale de l\'AI Act',
        shortContent: 'L\'AI Act s\'applique dans tous les États membres de l\'UE.',
        fullContent: 'L\'AI Act s\'applique dans tous les États membres de l\'UE. Il s\'applique également aux cas d\'usage IA utilisés par des acteurs établis dans un pays tiers si les résultats produits par le système sont destinées à être utilisés sur le territoire de l\'UE.',
        icon: '🌍'
      }
    },
    {
      id: 'description',
      question: 'Brève description du système IA ?',
      type: 'textarea',
      placeholder: 'Créez le résumé en cliquant sur le bouton AI, vous pourrez toujours le modifier…',
      tooltip: {
        title: 'Guide pour la description du système IA',
        shortContent: 'Résumez votre système IA : objectif principal, fonction clé, utilisateurs cibles, contexte métier et technologie utilisée.',
        fullContent: 'Résumez votre système IA : objectif principal, fonction clé, utilisateurs cibles, contexte métier et technologie utilisée (type d\'IA, modèle, fournisseur). Utilisez le bouton de génération automatique pour obtenir une première version, puis ajustez-la selon vos besoins.',
        icon: '📝'
      }
    }
  ]

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

    // Retourner les noms des modèles depuis le state availableModels
    return availableModels.map(model => model.model_name).sort()
  }

  // Fonction pour récupérer l'ID du modèle sélectionné
  const findModelId = (modelName: string): string | null => {
    if (!modelName || !availableModels.length) return null
    
    const model = availableModels.find(m => m.model_name === modelName)
    return model?.id || null
  }

  // Fonction pour détecter si le partenaire technologique est personnalisé
  const isCustomTechnologyPartner = (): boolean => {
    const selectedPartner = typeof formData.technology_partner === 'string' ? formData.technology_partner.trim() : ''
    if (!selectedPartner) return false
    
    // Vérifier si le partenaire sélectionné fait partie de la liste prédéfinie
    return !partners.some(p => p.name === selectedPartner)
  }

  // Update current question with dynamic models or text input for custom partners
  const currentQuestion = { 
    ...questions[currentQuestionIndex],
    ...(questions[currentQuestionIndex].id === 'llm_model_version' && {
      // Si partenaire personnalisé, utiliser un champ texte, sinon afficher les modèles radio
      type: isCustomTechnologyPartner() ? 'text' : 'radio',
      options: isCustomTechnologyPartner() ? [] : getAvailableModels().map(model => ({ label: model, examples: [] })),
      placeholder: isCustomTechnologyPartner() ? 'Spécifiez le modèle utilisé...' : undefined
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
      router.push('/dashboard/registries')
    }
  }, [user, mounted, companyId])

  // Additional safety check for SSR
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)
  }, [])

  // Charger les partenaires au démarrage
  useEffect(() => {
    if (mounted && user) {
      fetchPartners()
    }
  }, [mounted, user])

  // Charger les modèles disponibles quand le partenaire technologique change
  useEffect(() => {
    const selectedPartnerName = typeof formData.technology_partner === 'string' ? formData.technology_partner.trim() : ''
    if (selectedPartnerName) {
      // Trouver le provider correspondant
      const provider = partners.find(p => p.name === selectedPartnerName)
      if (provider) {
        setFormData(prev => ({ ...prev, technology_partner_id: provider.id }))
        // Charger les nouveaux modèles sans vider immédiatement la liste
        fetchAvailableModels(provider.id)
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la génération')
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
      setError('Impossible de générer la description automatiquement. Veuillez la saisir manuellement.')
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
    } else if (currentQuestion.id === 'deployment_date') {
      // For deployment date, validate format if provided
      const valueStr = typeof value === 'string' ? value : String(value)
      if (value && !validateDateFormat(valueStr)) {
        setError('Format de date invalide. Utilisez le format DD/MM/YYYY (ex: 15/06/2025)')
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

  const handleNext = () => {
    if (validateCurrentQuestion()) {
      if (isLastQuestion) {
        handleSubmit()
      } else {
        setCurrentQuestionIndex(prev => prev + 1)
        // Reset other radio value and countries selection when moving to next question
        setOtherRadioValue('')
        setOtherRadioSelected(false)
        if (currentQuestion.type === 'countries') {
          setSelectedCountries([])
        }
      }
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

  const handleSubmit = async () => {
    setSubmitting(true)
    
    try {
      // Déterminer le primary_model_id à partir du modèle sélectionné
      let primary_model_id = null
      if (formData.llm_model_version && !isCustomTechnologyPartner()) {
        const modelVersionStr = typeof formData.llm_model_version === 'string' ? formData.llm_model_version.trim() : String(formData.llm_model_version)
        primary_model_id = findModelId(modelVersionStr)
      }

      // Log des données à envoyer
      const payload = {
        name: formData.name,
        deployment_date: formData.deployment_date,
        responsible_service: formData.responsible_service,
        technology_partner: formData.technology_partner,
        technology_partner_id: formData.technology_partner_id, // Ajouter l'ID du partenaire si disponible
        llm_model_version: formData.llm_model_version,
        primary_model_id, // Ajouter l'ID du modèle principal
        ai_category: formData.ai_category,
        system_type: formData.system_type,
        deployment_countries: formData.deployment_countries,
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

      if (response.data) {
        console.log('Redirection vers:', `/dashboard/${companyId}`)
        router.push(`/dashboard/${companyId}`)
      }
    } catch (error: any) {
      console.error('=== ERREUR lors de la création du use case ===')
      console.error('Type d\'erreur:', error?.name)
      console.error('Message:', error?.message)
      console.error('Response:', error?.response)
      console.error('Response status:', error?.response?.status)
      console.error('Response data:', error?.response?.data)
      console.error('Stack trace:', error?.stack)
      
      // Message d'erreur plus détaillé
      const errorMessage = error?.response?.data?.error || error?.message || 'Erreur lors de la création du cas d\'usage'
      setError(errorMessage)
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

  const handleDateInputChange = (value: string, inputElement?: HTMLInputElement) => {
    // Remove non-digits except slashes for formatting
    let digits = value.replace(/[^\d]/g, '')
    
    // Limit to 8 digits (DDMMYYYY)
    digits = digits.substring(0, 8)
    
    // Format as DD/MM/YYYY with automatic slash insertion
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
    handleInputChange(newSelectedCountries.join(', '))
  }

  const removeCountry = (countryCode: string) => {
    const newSelectedCountries = selectedCountries.filter(country => country !== countryCode)
    setSelectedCountries(newSelectedCountries)
    handleInputChange(newSelectedCountries.join(', '))
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

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-0">
                {currentQuestion.question}
              </h2>
              {currentQuestion.tooltip && (
                <Tooltip 
                  title={currentQuestion.tooltip.title}
                  shortContent={currentQuestion.tooltip.shortContent}
                  fullContent={currentQuestion.tooltip.fullContent}
                  icon={currentQuestion.tooltip.icon}
                  type="question"
                />
              )}
            </div>
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
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && (
                <div className="space-y-3">
                  {/* Affichage spécial pour la question responsible_service avec 2 colonnes */}
                  {currentQuestion.id === 'responsible_service' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(currentQuestion.options as string[]).map((option, index) => (
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
                      ))}
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
              {/* Bouton de génération automatique pour la question description */}
              {currentQuestion.id === 'description' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-[#0080A3]" />
                    <span className="text-sm font-medium text-gray-700">
                      Génération automatique avec Mistral AI
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={generateDescriptionWithAI}
                    disabled={isGeneratingDescription || !formData.name || !formData.ai_category}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#0080A3] to-[#006080] text-white text-sm font-medium rounded-lg hover:from-[#006080] hover:to-[#005060] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isGeneratingDescription ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Génération...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Générer avec AI
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Affichage de la description générée */}
              {currentQuestion.id === 'description' && showGeneratedDescription && generatedDescription && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-800 flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Description générée par Mistral AI
                    </h4>
                    <button
                      onClick={() => setShowGeneratedDescription(false)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    {generatedDescription}
                  </p>
                  <div className="mt-3 text-xs text-blue-600">
                    ✅ Cette description a été pré-remplie dans le champ ci-dessous. Vous pouvez la modifier selon vos besoins.
                  </div>
                </div>
              )}

              {/* Champ textarea existant */}
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
                <div className={currentQuestion.id === 'technology_partner' || currentQuestion.id === 'ai_category' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}>
                  {(currentQuestion.options as { label: string; examples: string[]; tooltip?: { title: string; shortContent: string; fullContent?: string; icon?: string } }[]).map((option, index) => (
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
                            onChange={() => {
                              handleInputChange(option.label)
                              setOtherRadioValue('') // Reset other value when selecting predefined option
                              setOtherRadioSelected(false)
                            }}
                            className="h-5 w-5 text-[#0080A3] border-2 border-gray-300 focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {currentQuestion.id === 'technology_partner' ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <Image
                                  src={getProviderIcon(option.label)}
                                  alt={`Logo ${option.label}`}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 object-contain"
                                />
                              </div>
                              <div className="flex-1 flex items-center justify-between">
                                <div className="text-lg font-semibold text-gray-900">
                                  {option.label}
                                </div>
                                {partnerInfo[option.label as keyof typeof partnerInfo] && (
                                  <Tooltip
                                    title={partnerInfo[option.label as keyof typeof partnerInfo].title}
                                    shortContent={partnerInfo[option.label as keyof typeof partnerInfo].shortContent}
                                    fullContent={partnerInfo[option.label as keyof typeof partnerInfo].fullContent}
                                    icon={partnerInfo[option.label as keyof typeof partnerInfo].icon}
                                    rank={partnerInfo[option.label as keyof typeof partnerInfo].rank}
                                    type="answer"
                                    position="auto"
                                  />
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between w-full mb-2">
                                <div className="text-lg font-semibold text-gray-900">
                                  {option.label}
                                </div>
                                {option.tooltip && (
                                  <Tooltip
                                    title={option.tooltip.title}
                                    shortContent={option.tooltip.shortContent}
                                    fullContent={option.tooltip.fullContent}
                                    icon={option.tooltip.icon}
                                    type="answer"
                                    position="auto"
                                  />
                                )}
                              </div>
                              {option.examples.length > 0 && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Exemples : </span>
                                  <span className="text-gray-500">{option.examples.join(', ')}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}

                  {/* Other Option for questions that have hasOtherOption */}
                  {currentQuestion.hasOtherOption && (
                    <div className="space-y-3">
                      <label 
                        className={`group flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          otherRadioSelected
                            ? 'border-[#0080A3] bg-[#0080A3]/5'
                            : 'border-gray-200 hover:border-[#0080A3] hover:bg-[#0080A3]/5'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center h-6 mt-1">
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value="Autre"
                              checked={otherRadioSelected}
                              onChange={() => {
                                setOtherRadioSelected(true)
                                // Focus on the input field after a short delay
                                setTimeout(() => {
                                  const input = document.getElementById(`other-input-${currentQuestion.id}`)
                                  if (input) input.focus()
                                }, 100)
                              }}
                              className="h-5 w-5 text-[#0080A3] border-2 border-gray-300 focus:ring-[#0080A3] focus:ring-2 focus:ring-offset-0"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-semibold text-gray-900 mb-2">
                              Autre
                            </div>
                          </div>
                        </div>
                      </label>

                      {/* Other Input Field - Only show when "Autre" is selected */}
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
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:border-[#0080A3] focus:ring-2 focus:ring-[#0080A3] focus:ring-opacity-20 focus:outline-none transition-all duration-200"
                            placeholder={
                              currentQuestion.id === 'technology_partner' 
                                ? "Spécifiez le partenaire technologique..."
                                : "Spécifiez votre réponse..."
                            }
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentQuestion.type === 'countries' && (
            <div className="space-y-6">
              {/* Country Selector */}
              <div className="relative">
                <ReactFlagsSelect
                  countries={['US', 'GB', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'CH', 'AT', 'PT', 'IE', 'DK', 'SE', 'NO', 'FI', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LU', 'LV', 'LT', 'EE', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'VE', 'EC', 'BO', 'PY', 'SR', 'GY', 'FK', 'GF', 'AU', 'NZ', 'JP', 'KR', 'CN', 'IN', 'TH', 'VN', 'PH', 'ID', 'MY', 'SG', 'HK', 'TW', 'BD', 'PK', 'LK', 'NP', 'AF', 'IR', 'IQ', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'JO', 'LB', 'SY', 'IL', 'PS', 'TR', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'ET', 'KE', 'UG', 'TZ', 'RW', 'BI', 'DJ', 'SO', 'ER', 'SS', 'CF', 'TD', 'CM', 'GQ', 'GA', 'CG', 'CD', 'AO', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'ZA', 'MZ', 'MW', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE', 'MV', 'RU', 'BY', 'UA', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'KG', 'TJ', 'TM', 'UZ', 'MN']}
                  selected=""
                  onSelect={(code) => handleCountrySelect(code)}
                  searchable
                  placeholder="🌍 Rechercher et sélectionner un pays..."
                  className="w-full"
                  selectButtonClassName={`w-full px-4 py-3 text-lg border rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#0080A3] focus:border-[#0080A3] focus:outline-none transition-colors ${
                    error ? 'border-red-300' : 'border-gray-300'
                  }`}
                  showSelectedLabel={false}
                  showOptionLabel={true}
                />
              </div>

              {/* Selected Countries Display */}
              {selectedCountries.length > 0 && (
                <div className="bg-white border-2 border-[#0080A3] rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <CheckCircle className="h-5 w-5 text-[#0080A3] mr-2" />
                      Pays sélectionnés
                    </h3>
                    <span className="bg-[#0080A3] text-white text-sm font-medium px-3 py-1 rounded-full">
                      {selectedCountries.length}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCountries.map((countryCode) => (
                      <div 
                        key={countryCode} 
                        className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-6 flex items-center justify-center overflow-hidden rounded border border-gray-200">
                            <img 
                              src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
                              alt={`Drapeau ${countryCode}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-medium text-gray-900">
                            {new Intl.DisplayNames(['fr'], {type: 'region'}).of(countryCode)}
                          </span>
                        </div>
                        <button
                          onClick={() => removeCountry(countryCode)}
                          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200"
                          type="button"
                          title="Supprimer ce pays"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
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

export default function NewUseCasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3]"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <NewUseCasePageContent />
    </Suspense>
  )
} 