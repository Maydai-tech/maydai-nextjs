import { Metadata } from 'next'
import { Suspense } from 'react'
import SignupPage from './SignupPage'

export const metadata: Metadata = {
  title: 'Créer un compte | MaydAI',
  description: 'Créez votre compte MaydAI pour gérer la conformité AI Act de votre entreprise',
}

function SignupFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0080A3] mx-auto mb-4" />
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupPage />
    </Suspense>
  )
}
