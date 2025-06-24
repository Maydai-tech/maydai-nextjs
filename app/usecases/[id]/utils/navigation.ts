import { useRouter, usePathname } from 'next/navigation'
import { useCaseRoutes } from './routes'

export function useUseCaseNavigation(useCaseId: string, companyId: string) {
  const router = useRouter()
  const pathname = usePathname()

  const goToOverview = () => router.push(useCaseRoutes.overview(useCaseId))
  const goToEvaluation = () => router.push(useCaseRoutes.evaluation(useCaseId))
  const goToRapport = () => router.push(useCaseRoutes.rapport(useCaseId))
  const goToDashboard = () => router.push(useCaseRoutes.dashboard(companyId))
  const goToCompanies = () => router.push(useCaseRoutes.companies())

  const getCurrentSection = () => {
    if (pathname.includes('/evaluation')) return 'evaluation'
    if (pathname.includes('/rapport')) return 'rapport'
    return 'overview'
  }

  const isCurrentPath = (section: string) => getCurrentSection() === section

  return {
    goToOverview,
    goToEvaluation,
    goToRapport,
    goToDashboard,
    goToCompanies,
    getCurrentSection,
    isCurrentPath
  }
} 