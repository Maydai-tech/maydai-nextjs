import { Metadata } from 'next'
import SignupConfirmationPage from './SignupConfirmationPage'

export const metadata: Metadata = {
  title: 'Confirmation de votre adresse email | MaydAI',
  robots: { index: false, follow: false },
}

export default function SignupConfirmation() {
  return <SignupConfirmationPage />
}
