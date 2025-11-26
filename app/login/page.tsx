import { Metadata } from 'next'
import LoginPage from './LoginPage'

export const metadata: Metadata = {
  title: 'Connexion | MaydAI',
  description: 'Connectez-vous à votre compte MaydAI pour gérer la conformité AI Act de votre entreprise',
}

export default function Login() {
  return <LoginPage />
}
