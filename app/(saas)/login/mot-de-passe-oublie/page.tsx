import { Metadata } from 'next'
import ForgotPasswordPage from './ForgotPasswordPage'

export const metadata: Metadata = {
  title: 'Créer ou réinitialiser votre mot de passe | MaydAI',
  robots: { index: false, follow: false },
}

export default function ForgotPassword() {
  return <ForgotPasswordPage />
}
