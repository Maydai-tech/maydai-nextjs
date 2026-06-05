import DashboardSupportPage from './DashboardSupportPage'

interface DashboardSupportRouteProps {
  params: Promise<{
    id: string
  }>
}

export default function DashboardSupportRoute({ params }: DashboardSupportRouteProps) {
  return <DashboardSupportPage params={params} />
}
