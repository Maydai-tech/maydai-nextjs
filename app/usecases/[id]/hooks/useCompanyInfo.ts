/**
 * Hook pour récupérer les informations de la company
 * En particulier pour savoir si MaydAI est déclaré comme registre
 * et si l'utilisateur est owner du registre
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'

export function useCompanyInfo(companyId: string | null) {
  const { session } = useAuth()
  const [maydaiAsRegistry, setMaydaiAsRegistry] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
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
          setIsOwner(data.role === 'owner')
        }
      } catch (err) {
        console.warn('Error fetching company info:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyInfo()
  }, [companyId, session?.access_token])

  return { maydaiAsRegistry, isOwner, loading }
}

