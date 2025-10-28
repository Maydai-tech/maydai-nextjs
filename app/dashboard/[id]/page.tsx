import CompanyDashboardPage from './CompanyDashboardPage'

interface DashboardProps {
  params: Promise<{
    id: string
  }>
}

export default function CompanyDashboard({ params }: DashboardProps) {
  return <CompanyDashboardPage params={params} />
}
