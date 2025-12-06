/**
 * Hook pour récupérer les informations de la company
 * En particulier pour savoir si MaydAI est déclaré comme registre
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

interface CompanyInfo {
  maydai_as_registry: boolean
}

export function useCompanyInfo(companyId: string | null) {
  const { session } = useAuth()
  const [maydaiAsRegistry, setMaydaiAsRegistry] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId || !session?.access_token) {
      setLoading(false)
      return
    }

    const fetchCompanyInfo = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          setMaydaiAsRegistry(data.maydai_as_registry === true)
        }
      } catch (err) {
        console.warn('Error fetching company info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyInfo()
  }, [companyId, session?.access_token])

  return { maydaiAsRegistry, loading }
}

