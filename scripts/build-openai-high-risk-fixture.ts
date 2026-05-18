/**
 * Génère un payload JSON identique à celui passé à OpenAI (transformToOpenAIFormatComplete)
 * pour un cas d'usage « risque élevé » (domaine Annexe III, ex. RH).
 *
 * Usage : npx tsx --tsconfig tsconfig.json scripts/build-openai-high-risk-fixture.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { transformToOpenAIFormatComplete } from '../lib/openai-data-transformer'

const responses = [
  { question_code: 'E4.N7.Q1', single_value: 'E4.N7.Q1.B' },
  { question_code: 'E4.N7.Q1.2', single_value: 'E4.N7.Q1.2.A' },
  {
    question_code: 'E4.N7.Q2',
    multiple_codes: ['E4.N7.Q2.A'],
    multiple_labels: ['Emploi, gestion des travailleurs et accès à l\'emploi indépendant'],
  },
  {
    question_code: 'E4.N7.Q2.1',
    multiple_codes: ['E4.N7.Q2.1.E'],
    multiple_labels: ['Aucun de ces cas'],
  },
  {
    question_code: 'E4.N7.Q3',
    multiple_codes: ['E4.N7.Q3.E'],
    multiple_labels: ['Aucune de ces activités'],
  },
  {
    question_code: 'E4.N7.Q3.1',
    multiple_codes: ['E4.N7.Q3.1.E'],
    multiple_labels: ['Aucune de ces situations'],
  },
  { question_code: 'E5.N9.Q4', single_value: 'E5.N9.Q4.A' },
  { question_code: 'E5.N9.Q1', single_value: 'E5.N9.Q1.A' },
  { question_code: 'E5.N9.Q2', single_value: 'E5.N9.Q2.A' },
  { question_code: 'E5.N9.Q3', single_value: 'E5.N9.Q3.A' },
  {
    question_code: 'E5.N9.Q9',
    conditional_main: 'E5.N9.Q9.B',
    conditional_keys: ['security_details'],
    conditional_values: [
      'Tests périodiques sur jeux de validation, revue des logs, scans de vulnérabilités trimestriels.',
    ],
  },
  {
    question_code: 'E5.N9.Q5',
    multiple_codes: ['E5.N9.Q5.B'],
    multiple_labels: ['Personnelles'],
  },
  {
    question_code: 'E5.N9.Q6',
    conditional_main: 'E5.N9.Q6.B',
    conditional_keys: ['procedures_details'],
    conditional_values: [
      'Contrôles de complétude, détection de doublons, anonymisation des champs sensibles avant entraînement.',
    ],
  },
  {
    question_code: 'E5.N9.Q7',
    conditional_main: 'E5.N9.Q7.B',
    conditional_keys: ['registry_type', 'system_name'],
    conditional_values: ['Registre interne groupe', 'Présélection RH — IA'],
  },
  {
    question_code: 'E5.N9.Q8',
    conditional_main: 'E5.N9.Q8.B',
    conditional_keys: ['supervisor_name', 'supervisor_role'],
    conditional_values: ['Claire Martin', 'Responsable conformité RH'],
  },
  { question_code: 'E4.N8.Q12', single_value: 'E4.N8.Q12.B' },
  { question_code: 'E4.N8.Q9', single_value: 'E4.N8.Q9.A' },
  {
    question_code: 'E4.N8.Q10',
    conditional_main: 'E4.N8.Q10.C',
    conditional_keys: ['other_count'],
    conditional_values: [''],
  },
  {
    question_code: 'E4.N8.Q11',
    multiple_codes: ['E4.N8.Q11.A'],
    multiple_labels: ['Texte'],
  },
  { question_code: 'E6.N10.Q1', single_value: 'E6.N10.Q1.A' },
  { question_code: 'E6.N10.Q2', single_value: 'E6.N10.Q2.A' },
]

const usecase = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Présélection et tri des candidatures (ATS assisté par IA)',
  description:
    'Outil métier RH connecté à l’ATS : classement des CV, extraction de compétences et proposition d’une shortlist pour les recruteurs. Déployé dans l’UE (France, Allemagne). Les recruteurs valident manuellement les embauches ; l’IA ne décide pas seule du refus. Cas suivi dans MaydAI pour cartographier les obligations AI Act (Annexe III — emploi).',
  deployment_date: '2025-06-01',
  status: 'completed',
  risk_level: 'high',
  ai_category: 'high_risk',
  system_type: 'Système d’IA à impact sur l’emploi (Annexe III)',
  responsible_service: 'Ressources humaines / People Analytics',
  deployment_countries: ['FR', 'DE'],
  company_status: 'deployer',
  technology_partner: 'OpenAI',
  llm_model_version: 'gpt-4o',
  primary_model_id: '00000000-0000-4000-8000-0000000000m1',
  score_base: 52,
  score_model: 14,
  score_final: 48,
  is_eliminated: false,
  elimination_reason: '',
}

const company = {
  name: 'HelioLogistics Europe SAS',
  industry: 'Logistique et transport',
  city: 'Lyon',
  country: 'France',
}

const model = {
  id: '00000000-0000-4000-8000-0000000000m1',
  model_name: 'GPT-4o',
  model_provider: 'OpenAI',
  model_type: 'LLM',
  version: '2024-08',
}

const payload = transformToOpenAIFormatComplete(
  usecase as any,
  company,
  model,
  responses as any,
  'dpo@heliologistics.example'
)

const outDir = join(process.cwd(), 'fixtures')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, 'openai-assistant-payload-high-risk.json')
writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')
console.log('Écrit :', outPath)
