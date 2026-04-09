import { UseCase } from '@/lib/supabase'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'

// Interface pour les prochaines étapes
export interface UseCaseNextSteps {
  recommendations: string
  timeline: string
  introduction?: string
  evaluation?: string
  impact?: string
  conclusion?: string
  interdit_1?: string | null
  interdit_2?: string | null
  interdit_3?: string | null
  priorite_1?: string
  priorite_2?: string
  priorite_3?: string
  quick_win_1?: string
  quick_win_2?: string
  quick_win_3?: string
  action_1?: string
  action_2?: string
  action_3?: string
}

// Interface pour les données de score
export interface ScoreData {
  score: number
  is_eliminated: boolean
  category_scores: Array<{
    category_id: string
    category_name: string
    percentage: number
    evaluation_status?: 'not_evaluated'
  }>
}

// Interface pour les données de niveau de risque
export interface RiskLevelData {
  risk_level: string
  justification?: string
}

// Interface pour le profil utilisateur
export interface UserProfile {
  email: string
  first_name?: string
  last_name?: string
}

// Interface principale pour les données du rapport PDF
export interface PDFReportData {
  /** Préfixe optionnel pour absolufiger les liens To-do / Dossier (ex. https://app.example.com). */
  pdfCtaBaseUrl?: string
  /** Plan d’action standard (9 items) — même logique que le rapport web (phase 5). Vide si cas inacceptable. */
  canonicalPlanItems?: ReportCanonicalItem[]
  useCase: UseCase & {
    companies?: {
      id: string
      name: string
      industry: string
      city: string
      country: string
    }
    compl_ai_models?: {
      id: string
      model_name: string
      model_provider: string
      model_type?: string
      version?: string
    }
  }
  riskLevel: RiskLevelData
  score: ScoreData
  nextSteps: UseCaseNextSteps | null
  profile: UserProfile
  generatedDate: string
}

// Interface pour les métadonnées du rapport
export interface ReportMetadata {
  companyName: string
  useCaseName: string
  reportDate: string
  auditorEmail: string
  responsibleService: string
  deploymentCountries: string[]
  modelName: string
  modelProvider: string
  riskLevel: string
  complianceScore: number
}

// Interface pour les données de la table des matières
export interface TableOfContentsItem {
  title: string
  page?: number
  subsections?: Array<{
    title: string
    page: number
  }>
}

// Interface pour les données de conformité
export interface ComplianceData {
  companyStatus: string
  companyStatusDefinition: string
  obligations: string[]
  governanceMeasures: {
    organization: string[]
    quality: string[]
  }
  priorityActions: {
    immediate: string[]
    mediumTerm: string[]
  }
}

// Interface pour les données de sanctions
export interface SanctionsData {
  financialPenalties: Array<{
    type: string
    amount: string
    percentage: string
  }>
  timeline: Array<{
    date: string
    description: string
  }>
}

// Interface pour les données d'impact environnemental
export interface EnvironmentalImpactData {
  criteria: Array<{
    name: string
    description: string
    icon: string
  }>
}

// Interface pour les références légales
export interface LegalReferencesData {
  articles: Array<{
    number: string
    title: string
  }>
  annexes: Array<{
    number: string
    title: string
  }>
}

// Types utilitaires
export type RiskLevel = 'unacceptable' | 'high' | 'limited' | 'minimal'
export type CompanyStatus = 'utilisateur' | 'fabriquant_produits' | 'distributeur' | 'importateur' | 'fournisseur' | 'mandataire' | 'unknown'

// Fonctions utilitaires pour les labels
// Réexportation des fonctions utilitaires depuis le fichier centralisé
export { 
  getCompanyStatusLabel, 
  getCompanyStatusDefinition, 
  getRiskLevelLabel, 
  getRiskLevelJustification 
} from '../../utils/company-status'
