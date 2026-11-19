export type UserAccessibleCompanies = {
  companyIdsArray: string[]
  roleMap: Map<string, string>
}

export class CompanyAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompanyAccessError'
  }
}

/**
 * Consolide l'accès aux registres (companies) via user_companies, user_profiles et user_usecases.
 * Priorité des rôles : user_companies > user_profiles (hérité) > user_usecases ('user').
 */
export async function getUserAccessibleCompanies(
  userId: string,
  supabaseClient: any
): Promise<UserAccessibleCompanies> {
  try {
    const { data: userCompanies, error: userCompaniesError } = await supabaseClient
      .from('user_companies')
      .select('company_id, role')
      .eq('user_id', userId)

    if (userCompaniesError) {
      throw new CompanyAccessError('Error fetching user companies')
    }

    const companyIds = new Set<string>()
    const roleMap = new Map<string, string>()

    if (userCompanies) {
      userCompanies.forEach((uc: { company_id: string; role: string }) => {
        companyIds.add(uc.company_id)
        roleMap.set(uc.company_id, uc.role)
      })
    }

    const { data: profileAccess, error: profileAccessError } = await supabaseClient
      .from('user_profiles')
      .select('inviter_user_id, role')
      .eq('invited_user_id', userId)

    if (profileAccessError) {
      console.error('[CompanyAccessService]', profileAccessError)
    }

    if (profileAccess && profileAccess.length > 0) {
      for (const access of profileAccess) {
        const { data: inviterCompanies } = await supabaseClient
          .from('user_companies')
          .select('company_id')
          .eq('user_id', access.inviter_user_id)
          .in('role', ['owner', 'company_owner'])

        if (inviterCompanies) {
          inviterCompanies.forEach((ic: { company_id: string }) => {
            companyIds.add(ic.company_id)
            if (!roleMap.has(ic.company_id)) {
              roleMap.set(ic.company_id, access.role)
            }
          })
        }
      }
    }

    const { data: usecaseAccess, error: usecaseAccessError } = await supabaseClient
      .from('user_usecases')
      .select(`
        usecase_id,
        usecases (
          company_id
        )
      `)
      .eq('user_id', userId)

    if (usecaseAccessError) {
      console.error('[CompanyAccessService]', usecaseAccessError)
    }

    if (usecaseAccess) {
      usecaseAccess.forEach((ua: { usecases: unknown }) => {
        const usecases = ua.usecases as { company_id: string } | null
        if (!usecases || !usecases.company_id) return

        const companyId = usecases.company_id
        companyIds.add(companyId)
        if (!roleMap.has(companyId)) {
          roleMap.set(companyId, 'user')
        }
      })
    }

    return {
      companyIdsArray: Array.from(companyIds),
      roleMap,
    }
  } catch (error) {
    console.error('[CompanyAccessService]', error)
    throw error
  }
}
