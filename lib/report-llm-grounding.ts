/**
 * Résumé déterministe des faits questionnaire pour ancrer le rapport LLM (Lot A).
 * Source : seules les réponses enregistrées + métadonnées de parcours — pas d’inférence métier.
 */

import { QUESTIONS_DATA } from '@/lib/questions-data'
import type { RiskLevelCode } from '@/lib/risk-level'
import { QUESTIONNAIRE_VERSION_V3 } from '@/lib/questionnaire-version'
import {
  applyChecklistKeyOverlayToResponses,
  type ResponseInput,
} from '@/lib/slot-statuses'

/** Même forme que QuestionnaireParcoursMeta — évite import circulaire avec openai-data-transformer. */
export interface ReportGroundingParcoursMeta {
  questionnaire_version: number
  bpgv_variant: string | null
  ors_exit: string | null
  active_question_codes: string[]
}

export interface ReportGroundingDbResponse {
  question_code: string
  single_value?: string
  multiple_codes?: string[]
  multiple_labels?: string[]
  conditional_main?: string
  bpgv_keys?: string[] | null
  transparency_keys?: string[] | null
}

export interface ReportGroundingInput {
  responses: ReportGroundingDbResponse[]
  riskLevelCode: RiskLevelCode | null
  classificationImpossible: boolean
  questionnaireParcours?: ReportGroundingParcoursMeta | null
}

function optionLabel(questionCode: string, optionCode: string): string {
  const q = QUESTIONS_DATA[questionCode as keyof typeof QUESTIONS_DATA] as
    | { options?: Array<{ code: string; label: string }> }
    | undefined
  const opt = q?.options?.find((o) => o.code === optionCode)
  return opt?.label || optionCode
}

export function buildMap(responses: ReportGroundingDbResponse[]): Map<string, ReportGroundingDbResponse> {
  const m = new Map<string, ReportGroundingDbResponse>()
  for (const r of responses) {
    m.set(r.question_code, r)
  }
  return m
}

const FORBIDDEN_Q3 = new Set(['E4.N7.Q3.A', 'E4.N7.Q3.B', 'E4.N7.Q3.C', 'E4.N7.Q3.D'])
const FORBIDDEN_Q31 = new Set([
  'E4.N7.Q3.1.A',
  'E4.N7.Q3.1.B',
  'E4.N7.Q3.1.C',
  'E4.N7.Q3.1.D',
])

/** Libellés des cases « interdit » réellement cochées (hors « Aucune »). */
export function collectCheckedForbiddenMotifs(map: Map<string, ReportGroundingDbResponse>): string[] {
  const out: string[] = []
  const q3 = map.get('E4.N7.Q3')
  if (q3?.multiple_codes?.length) {
    for (const c of q3.multiple_codes) {
      if (FORBIDDEN_Q3.has(c)) {
        out.push(optionLabel('E4.N7.Q3', c))
      }
    }
  }
  const q31 = map.get('E4.N7.Q3.1')
  if (q31?.multiple_codes?.length) {
    for (const c of q31.multiple_codes) {
      if (FORBIDDEN_Q31.has(c)) {
        out.push(optionLabel('E4.N7.Q3.1', c))
      }
    }
  }
  return out
}

/** Domaines Annexe III cochés (E4.N7.Q2.1). */
export function collectAnnexIiiDomains(map: Map<string, ReportGroundingDbResponse>): string[] {
  const q = map.get('E4.N7.Q2.1')
  if (!q?.multiple_codes?.length) return []
  return q.multiple_codes.map((c) => optionLabel('E4.N7.Q2.1', c))
}

/**
 * Texte d’ancrage pour le prompt LLM (français, lignes courtes, autoritatif).
 */
export function formatReportGroundingForPrompt(input: ReportGroundingInput): string {
  const { responses, riskLevelCode, classificationImpossible, questionnaireParcours } = input
  const enriched = applyChecklistKeyOverlayToResponses(responses as ResponseInput[])
  const map = buildMap(enriched as ReportGroundingDbResponse[])
  const lines: string[] = []

  const v3 =
    questionnaireParcours?.questionnaire_version === QUESTIONNAIRE_VERSION_V3
  lines.push(`Parcours questionnaire (version déclarée) : ${questionnaireParcours?.questionnaire_version ?? 'non fourni'}${v3 ? ' (V3 — ancrage BPGV / pivots ci-dessous prioritaire sur toute formulation générique).' : ''}`)

  if (questionnaireParcours?.active_question_codes?.length) {
    lines.push(
      `Codes de questions effectivement posées (extrait) : ${questionnaireParcours.active_question_codes.slice(0, 40).join(', ')}${questionnaireParcours.active_question_codes.length > 40 ? ' …' : ''}`
    )
  }

  lines.push(
    classificationImpossible
      ? 'État qualification (application) : IMPOSSIBLE — aucun palier AI Act ne doit être conclu dans le texte.'
      : `Niveau AI Act retenu par l'application (code) : ${riskLevelCode ?? 'null'} — ne pas le contredire ni le remplacer par une analogie sectorielle.`
  )

  const forbidden = collectCheckedForbiddenMotifs(map)
  if (forbidden.length) {
    lines.push(`Motifs d'interdiction ART. 5 cochés (E4.N7.Q3 / E4.N7.Q3.1) — SEULES finalités à citer comme fondements d'interdiction :`)
    forbidden.forEach((t) => lines.push(`  - ${t}`))
    lines.push(
      `Règle : ne pas ajouter d'autres pratiques interdites (biométrie, notation sociale, manipulation, etc.) si elles n'apparaissent pas dans cette liste.`
    )
  } else {
    lines.push(
      `Aucune case « finalité interdite » (E4.N7.Q3 / Q3.1) cochée hors « Aucune » — ne pas inventer un motif Art. 5 pour expliquer un Interdit.`
    )
  }

  const annex = collectAnnexIiiDomains(map)
  if (annex.length) {
    lines.push(`Domaines / usages Annexe III déclarés cochés (E4.N7.Q2.1) :`)
    annex.forEach((t) => lines.push(`  - ${t}`))
  }

  const q9 = map.get('E4.N8.Q9')?.single_value
  const q91 = map.get('E4.N8.Q9.1')?.single_value
  if (q9 === 'E4.N8.Q9.A') {
    lines.push(
      `Branche « interaction » : E4.N8.Q9 = Oui — le système déclare une interaction directe avec des personnes physiques (interface, agent, vocal, messagerie, temps réel, etc.).`
    )
  } else if (q9 === 'E4.N8.Q9.B') {
    lines.push(`Branche « interaction » : E4.N8.Q9 = Non — pas d'interaction directe déclarée ; ne pas centrer la justification « risque limité » sur l'interaction utilisateur si le niveau est limited pour d'autres volets.`)
  }
  if (q91 === 'E4.N8.Q9.1.A') {
    lines.push(
      `Branche « émotions / biométrie hors cas déjà interdits ou haut risque » : E4.N8.Q9.1 = Oui — à traiter comme pivot limited distinct de l'interaction directe seule.`
    )
  } else if (q91 === 'E4.N8.Q9.1.B') {
    lines.push(`E4.N8.Q9.1 = Non — ne pas invoquer émotions/biométrie « complémentaire » comme cause principale du limited.`)
  }

  const t1 = map.get('E4.N8.Q11.T1')?.single_value
  const t1e = map.get('E4.N8.Q11.T1E')?.single_value
  const t2 = map.get('E4.N8.Q11.T2')?.single_value
  const m1 = map.get('E4.N8.Q11.M1')?.single_value
  const m2 = map.get('E4.N8.Q11.M2')?.single_value

  if (t1 === 'E4.N8.Q11.T1.A') {
    lines.push(
      `Volet texte (E4.N8.Q11.T1 = A) : information d'intérêt public sans validation humaine déclarée avant diffusion — profil transparence aligné sur le risque limité pour ce volet.`
    )
  } else if (t1 === 'E4.N8.Q11.T1.B') {
    lines.push(
      `Volet texte (E4.N8.Q11.T1 = B) : information d'intérêt public avec contrôle éditorial humain et responsabilité déclarée.`
    )
  } else if (t1 === 'E4.N8.Q11.T1.C' || t1 === 'E4.N8.Q11.T1.D' || t1 === 'E4.N8.Q11.T1.E') {
    lines.push(`Volet texte (E4.N8.Q11.T1) : ${optionLabel('E4.N8.Q11.T1', t1)}`)
  }
  if (t1e === 'E4.N8.Q11.T1E.A') {
    lines.push(
      `Réponse historique E4.N8.Q11.T1E = Oui (ancien parcours) — contrôle éditorial humain déclaré.`
    )
  } else if (t1e === 'E4.N8.Q11.T1E.B') {
    lines.push(`Réponse historique E4.N8.Q11.T1E = Non (ancien parcours).`)
  } else if (t1e === 'E4.N8.Q11.T1E.C') {
    lines.push(`E4.N8.Q11.T1E = Je ne sais pas — pivot non tranché (cohérent avec une qualification impossible si l'application l'indique).`)
  }
  if (t2) {
    lines.push(`Réponse historique E4.N8.Q11.T2 (ancien parcours) : ${optionLabel('E4.N8.Q11.T2', t2)}`)
  }

  if (m1 === 'E4.N8.Q11.M1.A') {
    lines.push(
      `Volet image/audio/vidéo : contenus synthétiques ou manipulés susceptibles d'être pris pour authentiques — deepfake / hypertrucage (E4.N8.Q11.M1 = Oui). Prioriser cette formulation plutôt qu'une généralité sur « contenus synthétiques » ou « transparence » sans lien média réaliste.`
    )
    if (m2 === 'E4.N8.Q11.M2.A') {
      lines.push(
        `Exception déclarée : œuvre / programme artistique, créatif, satirique ou de fiction, présenté comme tel (E4.N8.Q11.M2 = Oui) — mentionner explicitement cette exception sans nier le risque limité du volet.`
      )
    } else if (m2 === 'E4.N8.Q11.M2.B') {
      lines.push(`E4.N8.Q11.M2 = Non — pas d'exception artistique/fiction déclarée pour ce média.`)
    }
  } else if (m1 === 'E4.N8.Q11.M1.B') {
    lines.push(`E4.N8.Q11.M1 = Non — pas de deepfake / média « pris pour authentique » déclaré sur ce volet.`)
  }

  lines.push(
    `Description libre du cas (champ texte entreprise) : contexte secondaire uniquement — ne pas y puiser de motif juridique, d'interdiction ou de niveau de risque non listé ci-dessus ou dans les réponses détaillées du questionnaire.`
  )

  lines.push('')
  lines.push('INSTRUCTIONS evaluation_risque.justification (stabilisation rédactionnelle) :')
  if (classificationImpossible) {
    lines.push(
      `- Commencer par une formule fixe : « À ce stade, MaydAI ne conclut pas à un palier AI Act définitif : » puis décrire uniquement l'absence de pivot tranché ou d'information juridique (sans « risque minimal », « limité », « élevé », « interdit » comme conclusion).`
    )
  } else if (riskLevelCode === 'unacceptable') {
    if (forbidden.length) {
      lines.push(
        `- Commencer par : « Le classement Interdit est fondé sur les finalités ou situations suivantes, déclarées cochées : » puis énumérer exactement les libellés de la liste « Motifs d'interdiction » ci-dessus, sans en ajouter.`
      )
      lines.push(
        `- Ne pas mélanger dans la phrase d'ouverture d'autres branches (biométrie limited, interaction, deepfake) si elles ne sont pas dans cette liste.`
      )
      lines.push(
        `- Dans tout le corps du rapport (introduction_contextuelle, conclusion, impact_attendu, interdit_1) : ne citer aucune pratique prohibée à l'article 5 du règlement (UE) 2024/1689 autre que les libellés exacts de la liste « Motifs d'interdiction » ci-dessus (ex. ne pas ajouter biométrie, manipulation ou distorsion du comportement, notation sociale, etc., si absentes de cette liste).`
      )
      lines.push(
        `- Si un seul motif (ou une seule combinaison limitée) figure dans la liste, ne pas élargir le récit à d'autres interdits « à titre d'exemple » ou par association thématique.`
      )
    } else {
      lines.push(
        `- Aucun motif E4.N7.Q3 / Q3.1 listé : s'appuyer sur les seules réponses du questionnaire utiles au cas inacceptable (Annexe III, autres déclencheurs visibles dans les réponses déclarées) sans inventer de motif Art. 5.`
      )
      lines.push(
        `- introduction_contextuelle, conclusion, impact_attendu, interdit_1 : ne pas introduire de pratiques prohibées absentes des réponses ; rester sur les faits déclarés utiles à l'interdit.`
      )
    }
  } else if (riskLevelCode === 'limited') {
    const causes: string[] = []
    /** Ordre : média réaliste d’abord si coché (évite une justification trop « transparence générique »). */
    if (m1 === 'E4.N8.Q11.M1.A') causes.push('médias synthétiques / deepfake pris pour authentiques (E4.N8.Q11.M1)')
    if (q9 === 'E4.N8.Q9.A') causes.push('interaction directe avec personnes physiques (E4.N8.Q9)')
    if (q91 === 'E4.N8.Q9.1.A') causes.push('émotions / biométrie complémentaire en cadre autorisé (E4.N8.Q9.1)')
    if (t1 === 'E4.N8.Q11.T1.A' && t1e === 'E4.N8.Q11.T1E.B') {
      causes.push("texte d'intérêt public sans contrôle éditorial humain déclaré (ancien couple E4.N8.Q11.T1 + T1E)")
    } else if (t1 === 'E4.N8.Q11.T1.A') {
      causes.push("texte d'intérêt public sans validation humaine déclaré (E4.N8.Q11.T1 = A)")
    }
    if (causes.length) {
      lines.push(
        `- Cause(s) limited déclarée(s) côté application (à citer explicitement dans l'ordre suivant, sans en ajouter) : ${causes.join(' ; ')}.`
      )
      lines.push(
        `- Première phrase de la justification : reprendre la cause en tête de liste comme principale ; les autres ne sont que compléments si cochées.`
      )
    } else {
      lines.push(
        `- Risque limité sans pivot listé ci-dessus : rester factuel à partir des réponses « questionnaire_questions » et Annexe III, sans généralités sur transparence ou utilisateur final.`
      )
    }
  } else if (riskLevelCode === 'minimal') {
    lines.push(
      `- Si le volet texte + intérêt public + contrôle éditorial s'applique (E4.N8.Q11.T1 = B, ou ancien couple T1 + T1E = Oui), commencer par : « Le niveau Risque minimal est cohérent avec un volet texte d'intérêt public assorti d'un contrôle éditorial humain déclaré, » puis résumer sans suggérer un risque limité latent.`
    )
    lines.push(
      `- Éviter « utilisateur final » ou scénario B2C si E4.N8.Q9 = Non ou si le questionnaire indique usage interne / non orienté interaction directe.`
    )
    if (t1 === 'E4.N8.Q11.T1.B' || (t1 === 'E4.N8.Q11.T1.A' && t1e === 'E4.N8.Q11.T1E.A')) {
      lines.push(
        `- Volet texte public + contrôle éditorial (à développer dans introduction_contextuelle et dans evaluation_risque.justification, pas seulement une formule « risque minimal ») :`
      )
      lines.push(
        `  - Expliciter pourquoi la question E4.N8.Q11.T1 a été posée : le parcours teste le volet transparence (Art. 50.4) lorsque des textes peuvent informer le public sur des sujets d'intérêt public ; mentionner la validation ou relecture éditoriale humaine lorsque déclarée.`
      )
      lines.push(
        `  - Citer factuellement la réponse déclarée : E4.N8.Q11.T1 = B (intérêt public avec contrôle éditorial), ou ancien parcours avec T1 + T1E = Oui.`
      )
      lines.push(
        `  - Expliquer le lien : le profil « risque limité » lié à l'information d'intérêt public sans validation humaine (T1 = A) ne s'applique pas ici — d'où la cohérence du Risque minimal sur ce pivot.`
      )
    }
  } else if (riskLevelCode === 'high') {
    lines.push(
      `- Citer au moins un déclencheur réel parmi Annexe III cochée ou filière haut risque visible dans les réponses ; ne pas substituer la description libre.`
    )
  }

  if (!classificationImpossible && riskLevelCode === 'limited') {
    if (m1 === 'E4.N8.Q11.M1.A') {
      lines.push(
        `- Recommandations (9 slots) — deepfake / média réaliste : rattacher OCRU, information sur caractère généré ou manipulé, résilience et procédures aux contenus susceptibles d'être pris pour authentiques par les personnes effectivement exposées ; si E4.N8.Q9 = Non, cibler destinataires internes, équipes, maquettes, batch ou partenaires B2B selon les réponses, et éviter « utilisateur final » ou grand public si non déclaré.`
      )
    }
    if (q9 === 'E4.N8.Q9.A') {
      lines.push(
        `- Recommandations (9 slots) — interaction directe : ancrer clarté, information et supervision sur le canal réellement déclaré (interface, agent, vocal, messagerie, etc.) ; éviter un discours générique « tout public » si le questionnaire indique un périmètre restreint.`
      )
    }
  }

  lines.push(
    `- Recommandations (slots) : contextualiser OCRU / transparence / registre selon les réponses E4.N8.Q9 (interaction), E4.N8.Q11.* (médias), E5/E6 — ne pas imposer de scénario « utilisateur final » si le questionnaire indique usage interne ou sans interaction directe.`
  )

  return lines.join('\n')
}
