export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  dashboard: (companyId: string) => `/dashboard/${companyId}`,
  companies: () => '/dashboard/companies'
}

export const useCaseNavigation = [
  {
    key: 'overview',
    label: 'Aperçu',
    href: (id: string) => useCaseRoutes.overview(id)
  }
] 