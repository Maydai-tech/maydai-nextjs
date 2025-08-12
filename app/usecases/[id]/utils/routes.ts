export const useCaseRoutes = {
  overview: (id: string) => `/usecases/${id}`,
  dashboard: (companyId: string) => `/dashboard/${companyId}`,
  companies: () => '/dashboard/companies'
} 