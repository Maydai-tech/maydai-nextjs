import type { V3ShortPathOutcomeSignal } from './v3-short-path-outcome-signals'

/** Libellés longs pour le pré-diagnostic (affichage + texte partageable). */
export const V3_SHORT_PATH_RISK_LABELS: Record<string, string> = {
  minimal: 'Risque minimal (AI Act)',
  limited: 'Risque limité (AI Act)',
  high: 'Haut risque (AI Act)',
  unacceptable: 'Interdiction / cas inacceptable (AI Act)',
}

/** Éléments couverts par le court — hors signaux Q12/E6 (déjà listés à part). */
export const V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS: readonly string[] = [
  'Le positionnement du système et les garde-fous « lignes rouges » sur les questions parcourues ici.',
  'Les domaines sensibles et le contexte de déploiement, dans la mesure où le graphe du court les aborde.',
  'La partie usage & transparence incluse dans ce parcours (mêmes codes questionnaire que le parcours complet).',
  'Un socle maturité ciblé (mini-pack E5 réglementaire) pour un premier signal, sans l’exhaustivité du bloc E5 du parcours long.',
]

/** Ce que le court ne fait pas — pour éviter toute confusion avec maturité, preuves ou plan détaillé. */
export const V3_SHORT_PATH_REMAINING_ITEMS: readonly { title: string; detail: string }[] = [
  {
    title: 'Maturité opérationnelle complète (E5 étendu)',
    detail:
      'Le court couvre un mini-pack E5 ; l’approfondissement déclaratif, les questions annexes et le score de maturité complet restent dans le parcours long.',
  },
  {
    title: 'Preuves dans le dossier du cas',
    detail:
      'Ce pré-diagnostic ne vérifie pas les pièces jointes. Ce qui est « déclaré » au questionnaire reste à documenter dans le dossier.',
  },
  {
    title: 'Rapport détaillé et plan d’action complet',
    detail:
      'Produits après le parcours long, à partir des mêmes réponses enrichies et du reste du questionnaire.',
  },
  {
    title: 'Todo conformité opérationnelle',
    detail:
      'La todo se nourrit des actions concrètes et des preuves ; elle complète la qualification, sans la remplacer.',
  },
]

export function v3ShortPathRiskDisplayLabel(
  riskLevel: string | null | undefined,
  classificationStatus: string | null | undefined
): string {
  if (classificationStatus === 'impossible') {
    return 'Niveau non positionné (classification impossible sur ce périmètre)'
  }
  if (!riskLevel) return '—'
  return V3_SHORT_PATH_RISK_LABELS[riskLevel] ?? riskLevel
}

export function v3ShortPathQualificationShortLabel(classificationStatus: string | null | undefined): string {
  if (classificationStatus === 'impossible') return 'Classification impossible à ce stade'
  if (classificationStatus === 'qualified') return 'Qualification obtenue sur ce périmètre'
  return classificationStatus ?? '—'
}

/**
 * Formulations sobres sur les conséquences « immédiates » — sans confondre avec score ou preuves.
 */
export function getV3ShortPathImmediateImplicationLines(
  riskLevel: string | null | undefined,
  classificationStatus: string | null | undefined
): string[] {
  if (classificationStatus === 'impossible') {
    return [
      'Certaines réponses ou bifurcations empêchent de trancher le niveau AI Act sans compléments ou sans parcourir les questions manquantes.',
      'Le parcours complet ou des corrections ciblées permettent de lever l’ambiguïté, avec le même moteur de qualification.',
    ]
  }

  const rl = (riskLevel ?? '').toLowerCase()
  if (rl === 'minimal') {
    return [
      'Sur les éléments parcourus, le moteur positionne le cas vers le volet le plus léger du spectre AI Act.',
      'Les obligations concrètes (documentation, transparence, registre, etc.) dépendent du détail de votre situation : elles sont précisées dans le parcours long et le rapport.',
    ]
  }
  if (rl === 'limited') {
    return [
      'Un niveau « limité » implique en principe des exigences AI Act plus soutenues (documentation, supervision ou transparence selon les cas).',
      'Le parcours complet permet d’aligner score de maturité, preuves dans le dossier et plan d’action sur cette qualification.',
    ]
  }
  if (rl === 'high') {
    return [
      'Un haut niveau de risque appelle un cadre réglementaire renforcé et une gouvernance exigeante.',
      'Le pré-diagnostic ne remplace pas l’audit des contrôles ni les preuves : le parcours long structure la mise en œuvre.',
    ]
  }
  if (rl === 'unacceptable') {
    return [
      'Le moteur qualifie la situation comme inacceptable sur le périmètre parcouru : à traiter en priorité côté conformité et direction.',
      'Le parcours long, le dossier du cas et la todo conformité permettent d’ordonner les mesures et la traçabilité attendues.',
    ]
  }

  return [
    'Le niveau affiché s’appuie sur les réponses enregistrées ; affinez-le avec le parcours complet si des zones restent floues.',
  ]
}

export function getV3ShortPathWhyLongPathBullets(
  classificationStatus: string | null | undefined
): string[] {
  const base = [
    'Obtenir le score de maturité (E5), le rapport structuré et le plan d’action détaillé sur l’ensemble du questionnaire.',
    'Relier la qualification AI Act à la todo conformité et au dossier du cas pour passer de la déclaration à la preuve documentée.',
  ]
  if (classificationStatus === 'impossible') {
    return [
      'Répondre aux questions ou branches manquantes pour que le moteur puisse conclure sur le niveau AI Act.',
      ...base,
    ]
  }
  return base
}

const SHARE_DISCLAIMER =
  'Document interne — pré-diagnostic MaydAI (parcours court). Ne remplace pas un audit juridique ni l’examen des preuves dans le dossier du cas.'

/** Nom de fichier ASCII pour export `.txt` / `.md` (sans extension). */
export function v3ShortPathExportBasename(params: { useCaseName?: string | null; useCaseId: string }): string {
  const raw = (params.useCaseName ?? '').trim()
  const slug = (raw.length > 0 ? slugifyForFilename(raw) : 'cas') || 'cas'
  const idPart = (params.useCaseId || 'id').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12)
  return `maydai-prediagnostic-court-${slug}-${idPart}`
}

function slugifyForFilename(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48)
}

/**
 * Texte brut structuré pour copier-coller ou export `.txt` (même contenu que le presse-papiers).
 */
export function buildV3ShortPathShareablePlainText(params: {
  useCaseName?: string | null
  riskLevel: string | null | undefined
  classificationStatus: string | null | undefined
  signals: V3ShortPathOutcomeSignal[]
  /** Liens relatifs ; si `origin` est fourni, ils sont absolus. */
  links?: { label: string; path: string }[]
  origin?: string
}): string {
  const {
    useCaseName,
    riskLevel,
    classificationStatus,
    signals,
    links = [],
    origin,
  } = params

  const lines: string[] = []
  lines.push('PRÉ-DIAGNOSTIC AI ACT — PARCOURS COURT MAYDAI')
  lines.push('')
  if (useCaseName?.trim()) {
    lines.push(`Cas d’usage : ${useCaseName.trim()}`)
    lines.push('')
  }

  lines.push(`Qualification : ${v3ShortPathQualificationShortLabel(classificationStatus)}`)
  lines.push(`Niveau réglementaire indiqué : ${v3ShortPathRiskDisplayLabel(riskLevel, classificationStatus)}`)
  lines.push('')
  lines.push('Ce que cela implique (rappel) :')
  getV3ShortPathImmediateImplicationLines(riskLevel, classificationStatus).forEach((p) => {
    lines.push(`- ${p}`)
  })
  lines.push('')
  lines.push('Ce pré-diagnostic a permis d’établir :')
  V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS.forEach((b) => lines.push(`- ${b}`))
  signals.forEach((s) => lines.push(`- ${s.title} : ${s.detail}`))
  if (signals.length === 0) {
    lines.push('- Pas d’étape sensibilisation (Q12) ni transparence E6 sur votre branche du graphe.')
  }
  lines.push('')
  lines.push('Ce qui reste hors périmètre du court (à compléter ailleurs dans MaydAI) :')
  V3_SHORT_PATH_REMAINING_ITEMS.forEach((r) => lines.push(`- ${r.title} — ${r.detail}`))
  lines.push('')
  lines.push('Pourquoi enchaîner avec le parcours complet :')
  getV3ShortPathWhyLongPathBullets(classificationStatus).forEach((b) => lines.push(`- ${b}`))
  lines.push('')

  if (links.length > 0) {
    lines.push('Raccourcis :')
    const base = (origin ?? '').replace(/\/$/, '')
    links.forEach(({ label, path }) => {
      const href = base && path.startsWith('/') ? `${base}${path}` : path
      lines.push(`- ${label} : ${href}`)
    })
    lines.push('')
  }

  lines.push(SHARE_DISCLAIMER)
  return lines.join('\n')
}

/**
 * Markdown léger pour export `.md` ou rendu outil (titres, listes, liens cliquables).
 * Même périmètre informationnel que le texte brut.
 */
export function buildV3ShortPathShareableMarkdown(params: {
  useCaseName?: string | null
  riskLevel: string | null | undefined
  classificationStatus: string | null | undefined
  signals: V3ShortPathOutcomeSignal[]
  links?: { label: string; path: string }[]
  origin?: string
}): string {
  const {
    useCaseName,
    riskLevel,
    classificationStatus,
    signals,
    links = [],
    origin,
  } = params

  const parts: string[] = []
  parts.push('# Pré-diagnostic AI Act — parcours court MaydAI')
  parts.push('')
  if (useCaseName?.trim()) {
    parts.push(`**Cas d’usage :** ${escapeMarkdownInline(useCaseName.trim())}`)
    parts.push('')
  }

  parts.push('## Qualification AI Act')
  parts.push('')
  parts.push(`- **Statut :** ${escapeMarkdownInline(v3ShortPathQualificationShortLabel(classificationStatus))}`)
  parts.push(
    `- **Niveau réglementaire indiqué :** ${escapeMarkdownInline(v3ShortPathRiskDisplayLabel(riskLevel, classificationStatus))}`
  )
  parts.push('')
  parts.push('*Ce document reflète la qualification sur le périmètre du parcours court uniquement. Ce n’est pas un score de maturité ni une attestation sur les preuves du dossier.*')
  parts.push('')
  parts.push('## Ce que cela implique (rappel)')
  parts.push('')
  getV3ShortPathImmediateImplicationLines(riskLevel, classificationStatus).forEach((p) => {
    parts.push(`- ${escapeMarkdownInline(p)}`)
  })
  parts.push('')
  parts.push('## Ce pré-diagnostic a permis d’établir')
  parts.push('')
  V3_SHORT_PATH_ESTABLISHED_CORE_BULLETS.forEach((b) => parts.push(`- ${escapeMarkdownInline(b)}`))
  signals.forEach((s) =>
    parts.push(`- **${escapeMarkdownInline(s.title)}** — ${escapeMarkdownInline(s.detail)}`)
  )
  if (signals.length === 0) {
    parts.push(
      '- Pas d’étape sensibilisation (Q12) ni transparence E6 sur votre branche du graphe (parcours inchangé, périmètre affiché seul différent).'
    )
  }
  parts.push('')
  parts.push('## Ce qui reste hors périmètre du court (à compléter dans MaydAI)')
  parts.push('')
  V3_SHORT_PATH_REMAINING_ITEMS.forEach((r) =>
    parts.push(`- **${escapeMarkdownInline(r.title)}** — ${escapeMarkdownInline(r.detail)}`)
  )
  parts.push('')
  parts.push('## Pourquoi enchaîner avec le parcours complet')
  parts.push('')
  getV3ShortPathWhyLongPathBullets(classificationStatus).forEach((b) => parts.push(`- ${escapeMarkdownInline(b)}`))
  parts.push('')

  if (links.length > 0) {
    parts.push('## Liens utiles')
    parts.push('')
    const base = (origin ?? '').replace(/\/$/, '')
    links.forEach(({ label, path }) => {
      const href = base && path.startsWith('/') ? `${base}${path}` : path
      parts.push(`- [${escapeMarkdownLinkText(label)}](${escapeMarkdownUrl(href)})`)
    })
    parts.push('')
  }

  parts.push('---')
  parts.push('')
  parts.push(`*${escapeMarkdownInline(SHARE_DISCLAIMER)}*`)
  return parts.join('\n')
}

function escapeMarkdownInline(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/`/g, '\\`').replace(/_/g, '\\_')
}

function escapeMarkdownLinkText(s: string): string {
  return s.replace(/\]/g, '\\]')
}

function escapeMarkdownUrl(s: string): string {
  return s.replace(/\)/g, '%29').replace(/\s/g, '%20')
}

export function buildV3ShortPathMailtoParams(params: {
  useCaseName?: string | null
  /** URL absolue vers la synthèse du cas (optionnel). */
  overviewUrl?: string
}): { subject: string; body: string } {
  const name = params.useCaseName?.trim()
  const subject = name
    ? `MaydAI — Pré-diagnostic court (AI Act) — ${name}`
    : 'MaydAI — Pré-diagnostic court (AI Act)'
  const lines = [
    'Bonjour,',
    '',
    'Ci-joint une référence au cas dans MaydAI.',
    'Après connexion, ouvrez l’évaluation du cas (parcours court terminé) : utilisez « Copier le résumé », « Télécharger .txt » ou « Télécharger .md » pour joindre le pré-diagnostic à votre message.',
    '',
    params.overviewUrl ? `Synthèse du cas : ${params.overviewUrl}` : '',
    '',
    SHARE_DISCLAIMER,
  ].filter((l) => l.length > 0)
  return { subject, body: lines.join('\n') }
}

/**
 * Lien `mailto:` prêt à l’emploi (corps tronqué si dépassement des limites usuelles des clients mail).
 */
export function buildV3ShortPathMailtoHref(params: {
  useCaseName?: string | null
  overviewUrl?: string
  maxBodyChars?: number
}): string {
  const { subject, body } = buildV3ShortPathMailtoParams({
    useCaseName: params.useCaseName,
    overviewUrl: params.overviewUrl,
  })
  const max = params.maxBodyChars ?? 1800
  let b = body
  if (b.length > max) {
    b = `${b.slice(0, max - 40)}\n\n[… message tronqué — complétez depuis MaydAI …]`
  }
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(b)}`
}
