export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  evaluation: (id: string) => `/usecases/${id}/evaluation`,
  rapport: (id: string) => `/usecases/${id}/rapport`,
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
    key: 'rapport',
    label: 'Rapport',
    href: (id: string) => useCaseRoutes.rapport(id)
  }
] 