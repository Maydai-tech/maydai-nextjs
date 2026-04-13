/**
 * Regroupements **purement UX** pour le bloc qualification E4.N7 (Annexe III, art. 5, cas ORS).
 * Les codes réponses et le graphe ne doivent pas dépendre de ce fichier.
 */

export type E4N7VisualSegment =
  | 'prohibited-art5'
  | 'prohibited-situations'
  | 'ors-narrowing'
  | 'annex-iii'
  | null

export function getE4N7VisualSegment(questionId: string): E4N7VisualSegment {
  switch (questionId) {
    case 'E4.N7.Q3':
      return 'prohibited-art5'
    case 'E4.N7.Q3.1':
      return 'prohibited-situations'
    case 'E4.N7.Q2.1':
      return 'ors-narrowing'
    case 'E4.N7.Q2':
      return 'annex-iii'
    default:
      return null
  }
}

export type E4N7CalloutVariant = 'danger' | 'caution' | 'domains' | 'safeguard'

export interface E4N7StepCallout {
  variant: E4N7CalloutVariant
  title: string
  description: string
}

export function getE4N7StepCallout(questionId: string): E4N7StepCallout | null {
  switch (questionId) {
    case 'E4.N7.Q3':
      return null
    case 'E4.N7.Q3.1':
      return null
    case 'E4.N7.Q2.1':
      return null
    case 'E4.N7.Q2':
      return {
        variant: 'domains',
        title: 'Domaines sensibles — Annexe III (haut risque potentiel)',
        description:
          'Vous pouvez cocher plusieurs domaines si le système en couvre plusieurs. La case « Aucun de ces domaines » se comporte comme une réponse exclusive : elle décoche les autres.',
      }
    case 'E4.N7.Q5':
      return {
        variant: 'safeguard',
        title: 'Garde-fou — article 6.3',
        description:
          'Cette question ne s’affiche que lorsque vous avez un domaine Annexe III coché. Elle vérifie si l’IA se limite à une assistance sans influence directe sur la décision finale.',
      }
    default:
      return null
  }
}

export interface E4N7CheckboxGroup {
  key: string
  /** Omis si hideHeading : pas de titre de section (ex. option « Aucun » seule) */
  title?: string
  /** Pas de h3 ni description de groupe ; séparateur visuel au-dessus des cases */
  hideHeading?: boolean
  description?: string
  codes: string[]
}

const E4N7_Q2_GROUPS: E4N7CheckboxGroup[] = [
  {
    key: 'emploi-justice',
    title: 'Emploi, justice et démocratie',
    description: 'Travail, recrutement, justice et processus démocratiques.',
    codes: ['E4.N7.Q2.A', 'E4.N7.Q2.B'],
  },
  {
    key: 'migration-infra',
    title: 'Frontières et infrastructures vitales',
    description: 'Migration, asile, contrôles aux frontières, réseaux critiques (eau, énergie, transport…).',
    codes: ['E4.N7.Q2.C', 'E4.N7.Q2.D'],
  },
  {
    key: 'education-repressif',
    title: 'Éducation et activités répressives',
    description: 'Formation, évaluation des apprenants, outils d’enquête ou de répression autorisés par la loi.',
    codes: ['E4.N7.Q2.E', 'E4.N7.Q2.F'],
  },
  {
    key: 'aucun',
    title: 'Aucun de ces domaines',
    description: 'À cocher uniquement si aucune ligne ci-dessus ne correspond à votre cas.',
    codes: ['E4.N7.Q2.G'],
  },
]

const E4N7_Q3_GROUPS: E4N7CheckboxGroup[] = [
  {
    key: 'interdits-art5',
    title: 'Finalités prohibées listées',
    description: 'Quatre familles d’usages interdits par l’AI Act lorsqu’ils s’appliquent tels quels au système.',
    codes: ['E4.N7.Q3.A', 'E4.N7.Q3.B', 'E4.N7.Q3.C', 'E4.N7.Q3.D'],
  },
  {
    key: 'aucune-q3',
    hideHeading: true,
    codes: ['E4.N7.Q3.E'],
  },
]

const E4N7_Q3_1_GROUPS: E4N7CheckboxGroup[] = [
  {
    key: 'personne-autonomie',
    title: 'Vulnérabilités, manipulation, notation',
    description: 'Pratiques visant la personne, son comportement ou son profil social.',
    codes: ['E4.N7.Q3.1.A', 'E4.N7.Q3.1.B', 'E4.N7.Q3.1.C'],
  },
  {
    key: 'justice-risque',
    title: 'Risque criminel',
    description: 'Évaluation du risque d’infraction fondée sur le profilage ou des traits de personnalité.',
    codes: ['E4.N7.Q3.1.D'],
  },
  {
    key: 'aucune-q31',
    hideHeading: true,
    codes: ['E4.N7.Q3.1.E'],
  },
]

const E4N7_Q2_1_GROUPS: E4N7CheckboxGroup[] = [
  {
    key: 'biometrie-public',
    title: 'Biométrie et espaces publics',
    codes: ['E4.N7.Q2.1.A'],
  },
  {
    key: 'critique-services',
    title: 'Secteurs critiques et services essentiels',
    description: 'Composants de sécurité dans des secteurs réglementés, accès à des services essentiels.',
    codes: ['E4.N7.Q2.1.B', 'E4.N7.Q2.1.D'],
  },
  {
    key: 'education-eval',
    title: 'Éducation et évaluations à fort impact',
    codes: ['E4.N7.Q2.1.C'],
  },
  {
    key: 'aucun-q21',
    hideHeading: true,
    codes: ['E4.N7.Q2.1.E'],
  },
]

/** @returns null → rendu checkbox plat habituel */
export function getE4N7CheckboxGroups(questionId: string): E4N7CheckboxGroup[] | null {
  switch (questionId) {
    case 'E4.N7.Q2':
      return E4N7_Q2_GROUPS
    case 'E4.N7.Q3':
      return E4N7_Q3_GROUPS
    case 'E4.N7.Q3.1':
      return E4N7_Q3_1_GROUPS
    case 'E4.N7.Q2.1':
      return E4N7_Q2_1_GROUPS
    default:
      return null
  }
}

/** Vérifie que chaque option JSON est référencée une fois (garde-fou dev / régressions). */
export function assertE4N7GroupsCoverOptions(
  questionId: string,
  optionCodes: string[]
): void {
  const groups = getE4N7CheckboxGroups(questionId)
  if (!groups) return
  const listed = groups.flatMap((g) => g.codes)
  const setListed = new Set(listed)
  const setOpts = new Set(optionCodes)
  if (setListed.size !== listed.length) {
    throw new Error(`[${questionId}] codes dupliqués dans les groupes UX`)
  }
  if (setOpts.size !== optionCodes.length) {
    throw new Error(`[${questionId}] options JSON invalides`)
  }
  for (const c of optionCodes) {
    if (!setListed.has(c)) {
      throw new Error(`[${questionId}] option ${c} absente des groupes UX`)
    }
  }
  for (const c of listed) {
    if (!setOpts.has(c)) {
      throw new Error(`[${questionId}] code groupe ${c} inconnu dans le JSON`)
    }
  }
}
