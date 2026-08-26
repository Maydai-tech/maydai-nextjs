/** Exemples concrets pour les questions Oui/Non trop abstraites du chat évaluateur. */

const SIMPLE_QUESTION_EXAMPLES: Record<string, string> = {
  'E4.N8.Q12':
    'Oui : une vraie session (atelier, e-learning, briefing) pour les personnes qui lancent ou relisent l’IA, avec une trace (date, participants). Non : « tout le monde sait se servir de ChatGPT ».',
  'E5.N9.Q6':
    'Oui : un contrôle avant usage (échantillon relu, fichier source vérifié, règle du type « page juridique = relecture humaine »). Non : on envoie le contenu tel quel au modèle.',
  'E5.N9.Q1':
    'Oui : une fiche ou un process vivant qui liste les risques, un responsable, et quoi faire si ça dérape — revue au moins une fois par an. Non : « on fait attention » ou un document oublié.',
  'E5.N9.Q7':
    'Oui : une liste unique (tableur, outil interne, MaydAI) où ce cas d’usage est nommé, avec un responsable. Non : les usages IA restent dans des mails ou dans la tête des équipes.',
  'E5.N9.Q4':
    'Oui : un document qui dit quel modèle, pour quoi, avec quelles données, et comment on arrête le système. Non : seulement le contrat du fournisseur ou un README.',
  'E5.N9.Q8':
    'Oui : une personne peut bloquer, corriger ou ne pas publier le résultat (ex. relecture avant mise en ligne). Non : le résultat part tout seul, sans validation humaine.',
  'E5.N9.Q9':
    'Oui : des tests périodiques (qualité, plantage, accès non autorisé) ou un suivi d’incidents. Non : on n’a jamais rejoué un cas depuis la mise en service.',
  'E5.N9.Q3':
    'Oui : des consignes dans le prompt ou des filtres (ne pas traiter de secrets, refuser un contenu hors périmètre). Non : le modèle tourne sans consigne particulière.',
  'E6.N10.Q1':
    'Oui : la personne voit clairement que c’est une IA (mention du type « texte produit automatiquement »). Non : on dirait un texte humain, sans aucun signal.',
  'E6.N10.Q2':
    'Oui : une métadonnée, un filigrane ou un marqueur technique dans le fichier. Non : la sortie est indiscernable d’un export manuel.',
  'E6.N10.Q3':
    'Oui : une mention visible pour le public. Non : le visiteur n’a aucun moyen de savoir. « Non applicable » si le contenu n’est jamais montré à l’extérieur.',
  'E7.N11.Q1':
    'Oui : vous avez une idée de l’impact (modèle cloud, volume d’appels) et au moins un geste (modèle plus petit, cache). Non : jamais regardé.',
  'E7.N11.Q2':
    'Oui : contrastes, texte alternatif, le résultat n’est pas uniquement visuel. Non : jamais vérifié si une personne en situation de handicap peut l’utiliser.',
}

export type EvaluationProjectHint = {
  name?: string | null
  description?: string | null
}

function usableUsecaseName(name?: string | null): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (!trimmed || trimmed === 'Sans nom') return null
  return trimmed
}

export function buildSimpleQuestionExample(
  questionId: string,
  project?: EvaluationProjectHint | null
): string | null {
  const body = SIMPLE_QUESTION_EXAMPLES[questionId]
  if (!body) return null
  const name = usableUsecaseName(project?.name)
  const prefix = name ? `Pour « ${name} » : ` : 'Exemple : '
  return `${prefix}${body}`
}
