import { Metadata } from 'next'
import ResetPasswordPage from './ResetPasswordPage'

export const metadata: Metadata = {
  title: 'Choisissez votre mot de passe | MaydAI',
  robots: { index: false, follow: false },
}

export default function ResetPassword() {
  return <ResetPasswordPage />
}
