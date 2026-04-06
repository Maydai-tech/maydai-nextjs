/**
 * Métadonnées d’affichage communes au plan d’action standard (9 mesures) — web et PDF.
 * Les clés de slots suivent `REPORT_STANDARD_SLOT_KEYS_ORDERED` (catalogue).
 */

import { REPORT_STANDARD_SLOT_KEYS_ORDERED } from '@/lib/canonical-actions'

const S = REPORT_STANDARD_SLOT_KEYS_ORDERED

export interface ReportStandardPlanGroupUi {
  readonly slotKeys: readonly string[]
  readonly heading: string
  readonly subheading: string
  readonly iconSrc: string
  readonly iconAlt: string
}

export const REPORT_STANDARD_PLAN_GROUPS: readonly ReportStandardPlanGroupUi[] = [
  {
    slotKeys: [...S.slice(0, 3)],
    heading: 'Actions rapides et concrètes à mettre en œuvre :',
    subheading: 'Actions immédiates recommandées',
    iconSrc: '/icons/work-in-progress.png',
    iconAlt: 'Actions rapides',
  },
  {
    slotKeys: [...S.slice(3, 6)],
    heading: 'Mesures importantes de conformité à renseigner :',
    subheading: 'Actions réglementaires et documents techniques',
    iconSrc: '/icons/attention.png',
    iconAlt: 'Actions prioritaires',
  },
  {
    slotKeys: [...S.slice(6, 9)],
    heading: 'Trois actions structurantes à mener dans les 3 à 6 mois :',
    subheading: 'Actions à moyen terme',
    iconSrc: '/icons/schedule.png',
    iconAlt: 'Actions à moyen terme',
  },
]
