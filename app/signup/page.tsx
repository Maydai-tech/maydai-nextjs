import { Metadata } from 'next'
import SignupPage from './SignupPage'

export const metadata: Metadata = {
  title: 'Créer un compte | MaydAI',
  description: 'Créez votre compte MaydAI pour gérer la conformité AI Act de votre entreprise',
}

export default function Signup() {
  return <SignupPage />
}
