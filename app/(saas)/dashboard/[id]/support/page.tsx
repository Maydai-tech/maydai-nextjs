import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import DashboardSupportPage from './DashboardSupportPage'

interface DashboardSupportRouteProps {
  params: Promise<{
    id: string
  }>
}

function resolveSupportFAQRole(role: string | null | undefined): 'owner' | 'collaborator' {
  if (role === 'owner' || role === 'company_owner') {
    return 'owner'
  }
  return 'collaborator'
}

export default async function DashboardSupportRoute({ params }: DashboardSupportRouteProps) {
  const { id: companyId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: userCompany }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('user_companies')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  let userRole: 'owner' | 'collaborator'

  if (userCompany) {
    userRole = resolveSupportFAQRole(userCompany.role)
  } else {
    const { data: ownerRecord } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('role', 'owner')
      .maybeSingle()

    if (!ownerRecord) {
      redirect('/dashboard/registries')
    }

    const { data: profileAccess } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('inviter_user_id', ownerRecord.user_id)
      .eq('invited_user_id', user.id)
      .maybeSingle()

    if (!profileAccess) {
      redirect('/dashboard/registries')
    }

    userRole = 'collaborator'
  }

  return (
    <DashboardSupportPage
      companyId={companyId}
      userId={user.id}
      userRole={userRole}
      defaultEmail={user.email ?? ''}
      defaultFirstName={profile?.first_name ?? ''}
      defaultLastName={profile?.last_name ?? ''}
    />
  )
}
