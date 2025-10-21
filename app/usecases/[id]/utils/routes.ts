export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  evaluation: (id: string) => `/usecases/${id}/evaluation`,
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
    label: 'Aperçu',
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