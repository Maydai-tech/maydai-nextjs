/** Ajoute `entree=` (analytics GTM) sans impact sur le moteur ni les scores. */
export function withEvaluationEntree(href: string, entree: string): string {
  const q = encodeURIComponent(entree)
  return href.includes('?') ? `${href}&entree=${q}` : `${href}?entree=${q}`
}

export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  evaluation: (id: string) => `/usecases/${id}/evaluation`,
  /** V3 — coque parcours court (sans E5 ; Q12 + E6 si applicable) ; même graphe, saut de navigation côté UI. */
  evaluationShort: (id: string) => `/usecases/${id}/evaluation?parcours=court`,
  rapport: (id: string) => `/usecases/${id}/rapport`,
  conformite: (id: string) => `/usecases/${id}/conformite`,
  annexes: (id: string) => `/usecases/${id}/annexes`,
  collaboration: (id: string) => `/usecases/${id}/collaboration`,
  dashboard: (companyId: string) => `/dashboard/${companyId}`,
  companies: () => '/dashboard/registries'
}

export const useCaseNavigation = [
  {
    key: 'overview',
    label: 'Synthèse',
    href: (id: string) => useCaseRoutes.overview(id)
  },
  {
    key: 'conformite',
    label: 'Conformité',
    href: (id: string) => useCaseRoutes.conformite(id)
  },
  {
    key: 'rapport',
    label: 'Actions',
    href: (id: string) => useCaseRoutes.rapport(id)
  },
  {
    key: 'annexes',
    label: 'Annexes',
    href: (id: string) => useCaseRoutes.annexes(id)
  },
  {
    key: 'collaboration',
    label: 'Collaboration',
    href: (id: string) => useCaseRoutes.collaboration(id)
  }
] 