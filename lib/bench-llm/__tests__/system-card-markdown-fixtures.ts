function part(heading: string, status: string): string {
  return `## ${heading}

### 1. Résumé technique (EN → FR)
Résumé de test pour ${heading}.

### 2. Points clés d'évaluation de la System Card
- Point un
- Point deux

### 3. Conformité aux exigences de l'AI Act
| Exigence AI Act | Article / Annexe | Application au modèle | Statut |
| --- | --- | --- | --- |
| Documentation technique | Art. 53 | Application de test | ${status} |

### 4. Recommandations par Profil de l'Entreprise Cliente
**Fournisseur :** Tenir le dossier.
**Intégrateur :** Relier le système.
**Déployeur :** Surveiller l'usage.
`
}

export function gabaritMarkdown(status = 'Documenté'): string {
  return [
    part('PARTIE 1 : Documentation technique du système', status),
    part('PARTIE 2 : Qualité et gouvernance des données (Art. 10)', status),
    part('PARTIE 3 : Instructions système, prompts et garde-fous', status),
    part('PARTIE 4 : Système de gestion des risques (RSP)', status),
    part('PARTIE 5 : Plan de surveillance continue', status),
  ].join('\n')
}

export function markdownWithoutPartOne(): string {
  const body = gabaritMarkdown().replace(/## PARTIE 1 :[^\n]*\n/, '## Note liminaire\n')
  return body
}

export function englishMarkdown(): string {
  return [
    part('Technical Documentation', '✅'),
    part('Data Governance & Bias', 'Documenté indirectement par la fiche de base'),
    part('Prompts & Safeguards', "À charge de l'Intégrateur"),
    part('RSP & Risk Assessment', 'Hors périmètre public'),
    part('Monitoring & Oversight', 'Non applicable (exemption)'),
  ].join('\n').replace(/## /g, '### ')
}

export function auditedMarkdown(intro: string, status = 'Documenté'): string {
  return `${intro.trim()}\n\n${gabaritMarkdown(status)}`.trim()
}
