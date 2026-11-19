import { z } from 'zod'
import type { Question } from '@/app/(saas)/usecases/[id]/types/usecase'
import { buildSimpleQuestionExample, type EvaluationProjectHint } from '@/lib/mistral/evaluation-question-examples'

export const SAVE_EVALUATION_NODES_TOOL_NAME = 'save_evaluation_nodes' as const
export const SAVE_SINGLE_ANSWER_TOOL_NAME = 'save_single_answer' as const

/** Profil utilisateur (DPO, avocat, métier…) — n’impacte pas le scoring. */
export const PERSONA_QUESTION_ID = 'E4.N7.Q1.2' as const

export function isPersonaQuestionId(questionId: string): boolean {
  return questionId === PERSONA_QUESTION_ID
}

export function isMultiSelectEvaluationQuestion(
  question: Pick<EvaluationQuestionNode, 'type'>
): boolean {
  return question.type === 'checkbox' || question.type === 'tags'
}

export function combinableEvaluationOptions(
  question: EvaluationQuestionNode
): EvaluationQuestionOption[] {
  return question.options.filter((option) => !option.unique_answer)
}

export function hasBothEvaluationShortcut(question: EvaluationQuestionNode): boolean {
  return isMultiSelectEvaluationQuestion(question) && combinableEvaluationOptions(question).length === 2
}

export const EVALUATION_BOTH_OPTION_LABEL = 'Les deux' as const

export function toggleEvaluationCheckboxCode(
  question: EvaluationQuestionNode,
  selected: string[],
  code: string
): string[] {
  const option = question.options.find((item) => item.code === code)
  if (!option) return selected
  if (selected.includes(code)) return selected.filter((item) => item !== code)
  if (option.unique_answer) return [code]
  const uniqueCodes = new Set(
    question.options.filter((item) => item.unique_answer).map((item) => item.code)
  )
  return [...selected.filter((item) => !uniqueCodes.has(item)), code]
}

export function formatEvaluationCheckboxReply(
  question: EvaluationQuestionNode,
  selected: string[]
): string {
  const combinable = combinableEvaluationOptions(question)
  const combinableCodes = combinable.map((option) => option.code)
  if (
    hasBothEvaluationShortcut(question) &&
    combinableCodes.length === selected.length &&
    combinableCodes.every((code) => selected.includes(code))
  ) {
    return EVALUATION_BOTH_OPTION_LABEL
  }
  return question.options
    .filter((option) => selected.includes(option.code))
    .map((option) => option.label)
    .join(' ; ')
}

export const EVALUATION_ROLE_DEDUIT = ['fournisseur', 'deployeur', 'indetermine'] as const
export type EvaluationRoleDeduit = (typeof EVALUATION_ROLE_DEDUIT)[number]

export interface EvaluationNodes {
  role_deduit: EvaluationRoleDeduit
  is_art5_interdit: boolean
  domaine_annexe3: string
  explication_courte: string
}

export interface EvaluationQuestionOption {
  code: string
  label: string
  unique_answer?: boolean
}

export interface EvaluationQuestionNode {
  id: string
  question: string
  description: string | null
  type: Question['type']
  options: EvaluationQuestionOption[]
}

export type EvaluationChatMessageResponse = {
  type: 'MESSAGE'
  content: string
  data?: EvaluationNodes
}

export type EvaluationChatToolCallResponse = {
  type: 'TOOL_CALL'
  tool: typeof SAVE_EVALUATION_NODES_TOOL_NAME
  evaluationComplete: true
  data: EvaluationNodes
}

export type EvaluationNewQuestionNodeResponse = {
  type: 'NEW_QUESTION_NODE'
  question: EvaluationQuestionNode
  engineInstruction: string
  data?: EvaluationNodes
}

export type EvaluationPathCompleteResponse = {
  type: 'PATH_COMPLETE'
  data?: EvaluationNodes
}

export type EvaluationNotStartedResponse = {
  type: 'NOT_STARTED'
}

export type EvaluationChatApiResponse =
  | EvaluationChatMessageResponse
  | EvaluationChatToolCallResponse
  | EvaluationNewQuestionNodeResponse
  | EvaluationPathCompleteResponse
  | EvaluationNotStartedResponse

export function buildSaveEvaluationNodesTool() {
  return {
    type: 'function' as const,
    function: {
      name: SAVE_EVALUATION_NODES_TOOL_NAME,
      description:
        'Enregistre le rôle déduit, l’absence ou la présence de finalités interdites (Art. 5) et le domaine Annexe III dès que ces 3 éléments sont suffisamment clairs. Ne pas appeler tant qu’un doute matériel demeure.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['role_deduit', 'is_art5_interdit', 'domaine_annexe3', 'explication_courte'],
        properties: {
          role_deduit: {
            type: 'string',
            enum: [...EVALUATION_ROLE_DEDUIT],
            description:
              'Déployeur = usage sans modification substantielle. Fournisseur = développement, marque blanche ou modification substantielle (Art. 25). indetermine si le doute persiste.',
          },
          is_art5_interdit: {
            type: 'boolean',
            description:
              'true si l’IA a des finalités interdites (manipulation, biométrie temps réel, scoring social, déduction d’émotions au travail/école, etc.).',
          },
          domaine_annexe3: {
            type: 'string',
            minLength: 1,
            description:
              'Domaine Annexe III réellement visé. Emploi = uniquement recrutement, filtrage de candidatures, décisions sur les conditions de travail, promotion, licenciement ou évaluation des performances. Un sas, badge, contrôle d’accès ou ouverture de porte, même sur le lieu de travail et même biométrique, n’est PAS le domaine Emploi : mettre Aucun. Autres valeurs : Éducation, Justice, Infrastructures critiques, Migration, Activités répressives, ou Aucun.',
          },
          explication_courte: {
            type: 'string',
            minLength: 1,
            description: 'Pourquoi ces 3 nœuds ont été retenus, en une ou deux phrases simples.',
          },
        },
      },
    },
  }
}

export function buildSaveSingleAnswerTool() {
  return {
    type: 'function' as const,
    function: {
      name: SAVE_SINGLE_ANSWER_TOOL_NAME,
      description:
        'Enregistre la réponse de l’utilisateur à la question imposée par le moteur de conformité. Utiliser dès que l’utilisateur a clairement choisi une option.',
      strict: true,
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['question_id', 'selected_option_code'],
        properties: {
          question_id: {
            type: 'string',
            minLength: 1,
            description: 'Identifiant catalogue de la question (ex. E4.N8.Q9).',
          },
          selected_option_code: {
            type: 'string',
            minLength: 1,
            description: 'Code d’option catalogue (ex. E4.N8.Q9.A).',
          },
        },
      },
    },
  }
}

export function evaluationNodesSchema() {
  return z.object({
    role_deduit: z.enum(EVALUATION_ROLE_DEDUIT),
    is_art5_interdit: z.boolean(),
    domaine_annexe3: z.string().trim().min(1).max(120),
    explication_courte: z.string().trim().min(1).max(600),
  })
}

export function parseEvaluationNodes(raw: unknown): EvaluationNodes | null {
  const parsed = evaluationNodesSchema().safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function parseSingleAnswer(raw: unknown): {
  question_id: string
  selected_option_code: string
} | null {
  const parsed = z
    .object({
      question_id: z.string().trim().min(1),
      selected_option_code: z.string().trim().min(1),
    })
    .safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function buildEngineInstruction(question: EvaluationQuestionNode): string {
  const options = question.options
    .map((option) => `${option.code} — ${option.label}`)
    .join(' ; ')
  const description = question.description ? ` ${question.description}` : ''
  return `Le moteur de conformité a besoin de savoir ceci : ${question.question}${description} Options : ${options}. Pose la question à l'utilisateur de façon naturelle et utilise l'outil save_single_answer dès qu'il te répond (question_id=${question.id}, selected_option_code=code de l'option choisie).`
}

export const ANNEX_DOMAIN_MISMATCH_CODE = 'ANNEX_DOMAIN_MISMATCH' as const
export const ANNEX_DOMAIN_MISMATCH_LABEL = 'Cela ne correspond pas à ce domaine' as const

const ANNEX_III_Q5_CONTEXT: Record<string, { title: string; meaning: string }> = {
  'E4.N7.Q2.A': {
    title: 'Emploi, gestion des travailleurs et accès à l’emploi indépendant',
    meaning:
      'recruter, filtrer des candidatures, décider des conditions de travail, d’une promotion ou d’un licenciement, ou évaluer les performances',
  },
  'E4.N7.Q2.B': {
    title: 'Administration de la justice et processus démocratiques',
    meaning: 'aider à préparer ou influer une décision de justice ou un processus démocratique',
  },
  'E4.N7.Q2.C': {
    title: 'Migration, asile et gestion des contrôles aux frontières',
    meaning: 'évaluer un risque migratoire, une demande d’asile, de visa ou de titre de séjour',
  },
  'E4.N7.Q2.D': {
    title: 'Gestion et exploitation des infrastructures critiques',
    meaning: 'décider du fonctionnement d’une infrastructure critique (eau, énergie, transport…)',
  },
  'E4.N7.Q2.E': {
    title: 'Éducation et formation professionnelle',
    meaning: 'décider de l’accès à une formation, évaluer des acquis ou orienter un parcours',
  },
  'E4.N7.Q2.F': {
    title: 'Activités répressives',
    meaning: 'appuyer une enquête, une qualification pénale ou une mesure répressive',
  },
}

function annexCodesFromAnswers(answers: Record<string, unknown> | undefined): string[] {
  const raw = answers?.['E4.N7.Q2']
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string')
  if (typeof raw === 'string') return [raw]
  return []
}

export function isAnnexDomainMismatchSelection(raw: string): boolean {
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return [
    /cela ne correspond pas/,
    /pas (ce|du) domaine/,
    /juste (un )?badge/,
    /comme un badge/,
    /ouvrir la porte/,
    /ouverture de porte/,
    /\bsas\b/,
    /controle d['’ ]?acces/,
    /contrôle d['’ ]?accès/,
  ].some((pattern) => pattern.test(normalized))
}

/** Reformule Q5 (art. 6.3) et ajoute un exemple concret aux questions Oui/Non trop sèches. */
export function contextualizeEvaluationQuestion(
  question: EvaluationQuestionNode,
  answers?: Record<string, unknown>,
  project?: EvaluationProjectHint | null
): EvaluationQuestionNode {
  if (question.id === 'E4.N7.Q5') {
    const domain = annexCodesFromAnswers(answers)
      .map((code) => ANNEX_III_Q5_CONTEXT[code])
      .find(Boolean)
    const title = domain?.title ?? 'un domaine Annexe III'
    const meaning = domain?.meaning ?? 'une décision à fort impact listée par l’Annexe III'

    return {
      ...question,
      question: `Le cas a été rattaché au domaine « ${title} ». Dans ce domaine, l’IA se limite-t-elle à aider un humain, sans peser sur la décision finale (${meaning}) ?`,
      description:
        'Cette question (article 6.3) ne vise pas un contrôle d’accès type badge, sas ou ouverture de porte. Si votre système ne fait que ça, choisissez « Cela ne correspond pas à ce domaine ».',
      options: [
        ...question.options,
        { code: ANNEX_DOMAIN_MISMATCH_CODE, label: ANNEX_DOMAIN_MISMATCH_LABEL },
      ],
    }
  }

  const example = buildSimpleQuestionExample(question.id, project)
  if (!example) return question
  return { ...question, description: example }
}

/** Message visible si l’agent ne reformule pas la question du graphe. */
export function formatEvaluationQuestionForChat(question: EvaluationQuestionNode): string {
  const lines = [question.question.trim()]
  const description = question.description?.trim()
  if (description) lines.push('', description)
  if (isPersonaQuestionId(question.id)) {
    return lines.join('\n')
  }
  if (question.options.length > 0) {
    lines.push('')
    for (const option of question.options) {
      lines.push(`• ${option.label}`)
    }
    if (hasBothEvaluationShortcut(question)) {
      lines.push(`• ${EVALUATION_BOTH_OPTION_LABEL}`)
    }
  }
  return lines.join('\n')
}

/** Messages d’attente / faux « je m’en occupe » qui bloquent le chat s’ils sont affichés tels quels. */
export function isStallingEvaluationMessage(text: string): boolean {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return [
    /je vous tiens informe/,
    /des que c['’ ]?est fait/,
    /cela prend quelques secondes/,
    /quelques secondes/,
    /veuillez patienter/,
    /un instant s['’]?il vous plait/,
    /je reviens (vers vous|d['’]ici)/,
    /je m['’ ]en occupe/,
    /c['’ ]est en cours/,
    /je m['’ ]en charge/,
  ].some((pattern) => pattern.test(normalized))
}
