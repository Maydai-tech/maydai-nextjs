'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading) {
      if (user) {
        // User is logged in, redirect to company selection
        router.push('/dashboard/companies')
      } else {
        // User is not logged in, redirect to login
        router.push('/login')
      }
    }
  }, [user, loading, router, mounted])

  // During loading or before mount, the GlobalLoader handles the display
  // After auth resolution, we redirect immediately
  return null
}
