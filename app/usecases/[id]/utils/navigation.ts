import { useRouter, usePathname } from 'next/navigation'
import { useCaseRoutes } from './routes'

export function useUseCaseNavigation(useCaseId: string, companyId: string) {
  const router = useRouter()
  const pathname = usePathname()

  const goToOverview = () => router.push(useCaseRoutes.overview(useCaseId))
  const goToDashboard = () => router.push(useCaseRoutes.dashboard(companyId))
  const goToCompanies = () => router.push(useCaseRoutes.companies())

  const getCurrentSection = () => {
    return 'overview'
  }

  const isCurrentPath = (section: string) => getCurrentSection() === section

  return {
    goToOverview,
    goToDashboard,
    goToCompanies,
    getCurrentSection,
    isCurrentPath
  }
} 