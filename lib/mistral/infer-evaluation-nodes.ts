import type { EvaluationNodes, EvaluationRoleDeduit } from '@/lib/mistral/evaluation-tool'
import { mapAnnexe3ToOptionCode, ANNEX_NONE_OPTION_CODE } from '@/lib/mistral/map-evaluation-nodes'

const ANNEX_CODE_TO_DOMAIN: Record<string, string> = {
  [ANNEX_NONE_OPTION_CODE]: 'Aucun',
  'E4.N7.Q2.A': 'Emploi',
  'E4.N7.Q2.B': 'Justice',
  'E4.N7.Q2.C': 'Migration',
  'E4.N7.Q2.D': 'Infrastructures critiques',
  'E4.N7.Q2.E': 'Éducation',
  'E4.N7.Q2.F': 'Activités répressives',
}

function normalizeReply(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Découpe « 1. … 2. … 3. … » en items (ignore GPT-5.3 : il faut un espace après le point). */
export function extractNumberedReplyItems(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const matches = [
    ...trimmed.matchAll(/(?:^|[\n\s])(\d+)[.)]\s+([\s\S]*?)(?=(?:[\n\s]+\d+[.)]\s+)|$)/g),
  ]
  if (matches.length < 2) return []
  return matches
    .map((match) => match[2].trim().replace(/[.;]+$/u, '').trim())
    .filter(Boolean)
}

function firstPolarity(text: string): 'oui' | 'non' | null {
  const first = normalizeReply(text).split(' ')[0]
  if (first === 'oui' || first === 'yes') return 'oui'
  if (first === 'non' || first === 'no') return 'non'
  return null
}

function inferRoleFromItem(text: string): EvaluationRoleDeduit | null {
  const normalized = normalizeReply(text)
  if (/sans modification|sans le modifier|tel quel/.test(normalized)) return 'deployeur'
  if (
    /marque blanche|sous notre (propre )?(nom|marque)|nous developpons|on (a )?(le )?developpe/.test(
      normalized
    )
  ) {
    return 'fournisseur'
  }
  if (/modification substantielle/.test(normalized) && !/\bsans\b/.test(normalized)) {
    return 'fournisseur'
  }
  if (
    /\b(gpt|chatgpt|claude|mistral|gemini)\b/.test(normalized) &&
    /\b(utilise|usage|sans)\b/.test(normalized)
  ) {
    return 'deployeur'
  }
  return null
}

function inferArt5FromItem(text: string): boolean | null {
  const normalized = normalizeReply(text)
  if (
    /non a tout|aucune de ces|pas d activites interdites|rien de (tout )?cela|aucune pratique/.test(
      normalized
    )
  ) {
    return false
  }
  const polarity = firstPolarity(text)
  if (polarity === 'non') return false
  if (polarity === 'oui') return true
  return null
}

function inferAnnexDomainFromItem(text: string): string | null {
  const mapped = mapAnnexe3ToOptionCode(text)
  if (mapped && ANNEX_CODE_TO_DOMAIN[mapped]) return ANNEX_CODE_TO_DOMAIN[mapped]

  const normalized = normalizeReply(text)
  if (
    /marketing|publicit|communication|contenu (web|editorial)|juste du/.test(normalized)
  ) {
    return 'Aucun'
  }
  if (firstPolarity(text) === 'non') return 'Aucun'
  return null
}

/**
 * Relie une réponse groupée aux 3 nœuds d’entrée (rôle, Art. 5, Annexe III)
 * que l’évaluateur pose parfois en un seul message, sans appeler le tool.
 */
export function inferInitialEvaluationNodesFromReply(
  userText: string
): EvaluationNodes | null {
  const items = extractNumberedReplyItems(userText)
  if (items.length < 3) return null

  const role = inferRoleFromItem(items[0])
  const art5 = inferArt5FromItem(items[1])
  const domaine = inferAnnexDomainFromItem(items[2])
  if (!role || role === 'indetermine' || art5 === null || !domaine) return null

  const explication = items.join(' ').replace(/\s+/g, ' ').trim().slice(0, 600)
  return {
    role_deduit: role,
    is_art5_interdit: art5,
    domaine_annexe3: domaine,
    explication_courte: explication || 'Réponses groupées aux 3 questions d’entrée.',
  }
}
