import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignIn = jest.fn()
const mockAuth = {
  getSession: jest.fn(),
  resend: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
}
const mockEstablish = jest.fn()
const mockFinalize = jest.fn()
const mockSendLoginEvent = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams('email=jean@ex.fr'),
}))
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}))
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ signIn: mockSignIn, user: null, loading: false }),
}))
jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return { auth: mockAuth }
  },
}))
jest.mock('@/lib/gtm', () => ({ sendLoginEvent: (...args: unknown[]) => mockSendLoginEvent(...args) }))
jest.mock('@/lib/signup-utm-hrefs', () => ({ SIGNUP_HREF: { login: '/signup?utm_source=login' } }))
jest.mock('@/lib/auth-email-links', () => ({
  ...jest.requireActual('@/lib/auth-email-links'),
  establishSessionFromUrl: () => mockEstablish(),
}))
jest.mock('@/lib/signup-finalize', () => ({
  finalizePendingSignup: (...args: unknown[]) => mockFinalize(...args),
  getPendingSignup: (s: { user?: { user_metadata?: { pending_signup?: unknown } } } | null) =>
    s?.user?.user_metadata?.pending_signup ?? null,
}))

import LoginPage from '@/app/(saas)/login/LoginPage'
import ForgotPasswordPage from '@/app/(saas)/login/mot-de-passe-oublie/ForgotPasswordPage'
import ResetPasswordPage from '@/app/(saas)/login/nouveau-mot-de-passe/ResetPasswordPage'
import SignupConfirmationPage from '@/app/(saas)/signup/confirmation/SignupConfirmationPage'
import PasswordChangeCard from '@/components/Settings/PasswordChangeCard'

const session = { access_token: 'jwt', user: { id: 'u1', email: 'jean@ex.fr', user_metadata: {} } }

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.getSession.mockResolvedValue({ data: { session } })
  mockFinalize.mockResolvedValue(true)
})

function fillPassword(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('LoginPage (mot de passe)', () => {
  test('pré-remplit l’email, affiche le bandeau et bascule la visibilité du mot de passe', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Email')).toHaveValue('jean@ex.fr')
    expect(screen.getByText('Créez le vôtre')).toHaveAttribute('href', '/login/mot-de-passe-oublie')
    expect(screen.getByText('Mot de passe oublié ?')).toHaveAttribute('href', '/login/mot-de-passe-oublie')
    const input = screen.getByLabelText('Mot de passe')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  test('connexion réussie → événement login puis tableau de bord', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    render(<LoginPage />)
    fillPassword('Mot de passe', 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
    expect(mockSignIn).toHaveBeenCalledWith('jean@ex.fr', 'secret123')
    expect(mockSendLoginEvent).toHaveBeenCalledWith('email')
    expect(mockFinalize).not.toHaveBeenCalled()
  })

  test('inscription confirmée ailleurs → finalise le profil à la connexion', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const pendingSession = { ...session, user: { ...session.user, user_metadata: { pending_signup: { profile: {} } } } }
    mockAuth.getSession.mockResolvedValue({ data: { session: pendingSession } })
    render(<LoginPage />)
    fillPassword('Mot de passe', 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalled())
    expect(mockFinalize).toHaveBeenCalledWith(pendingSession)
  })

  test('identifiants incorrects → message avec lien de création', async () => {
    mockSignIn.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
    render(<LoginPage />)
    fillPassword('Mot de passe', 'mauvais')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText(/Email ou mot de passe incorrect/)).toBeInTheDocument()
    expect(screen.getByText('Créez-le')).toHaveAttribute('href', '/login/mot-de-passe-oublie')
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('email non confirmé → renvoi de l’email de confirmation', async () => {
    mockSignIn.mockResolvedValue({ error: { code: 'email_not_confirmed', message: 'Email not confirmed' } })
    mockAuth.resend.mockResolvedValue({ error: null })
    render(<LoginPage />)
    fillPassword('Mot de passe', 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Renvoyer l'email de confirmation/ }))
    await waitFor(() =>
      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'jean@ex.fr',
        options: { emailRedirectTo: 'http://localhost/signup/confirmation' },
      })
    )
    expect(await screen.findByText('Email de confirmation renvoyé.')).toBeInTheDocument()
  })

  test('trop de tentatives → bandeau d’attente', async () => {
    mockSignIn.mockResolvedValue({ error: { status: 429, message: 'rate limit' } })
    render(<LoginPage />)
    fillPassword('Mot de passe', 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText('Veuillez patienter quelques instants')).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  test('envoie le lien vers la page de choix du mot de passe sans révéler l’existence du compte', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'inconnu@ex.fr' } })
    fireEvent.click(screen.getByRole('button', { name: /Recevoir le lien/ }))
    expect(await screen.findByText('Consultez votre boîte mail')).toBeInTheDocument()
    expect(screen.getByText(/Si un compte existe pour/)).toHaveTextContent('inconnu@ex.fr')
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('inconnu@ex.fr', {
      redirectTo: 'http://localhost/login/nouveau-mot-de-passe',
    })
    fireEvent.click(screen.getByRole('button', { name: /Renvoyer l'email/ }))
    await waitFor(() => expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledTimes(2))
  })
})

describe('ResetPasswordPage', () => {
  test('lien invalide → message et lien vers une nouvelle demande', async () => {
    mockEstablish.mockResolvedValue({ session: null, error: 'expired' })
    render(<ResetPasswordPage />)
    expect(await screen.findByText('Lien invalide ou expiré')).toBeInTheDocument()
    expect(screen.getByText('Demander un nouveau lien')).toHaveAttribute('href', '/login/mot-de-passe-oublie')
  })

  test('valide la confirmation puis enregistre et redirige', async () => {
    mockEstablish.mockResolvedValue({ session, error: null })
    mockAuth.updateUser.mockResolvedValue({ error: null })
    render(<ResetPasswordPage />)
    expect(await screen.findByText('jean@ex.fr')).toBeInTheDocument()

    fillPassword('Nouveau mot de passe', 'motdepasse')
    fillPassword('Confirmer le mot de passe', 'autre-chose')
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et me connecter/ }))
    expect(await screen.findByText(/ne correspondent pas/)).toBeInTheDocument()
    expect(mockAuth.updateUser).not.toHaveBeenCalled()

    fillPassword('Confirmer le mot de passe', 'motdepasse')
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et me connecter/ }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'motdepasse' })
  })
})

describe('SignupConfirmationPage', () => {
  test('lien valide → finalise l’inscription et redirige', async () => {
    mockEstablish.mockResolvedValue({ session, error: null })
    render(<SignupConfirmationPage />)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
    expect(mockFinalize).toHaveBeenCalledWith(session)
  })

  test('échec complete-signup → message et réessai', async () => {
    mockEstablish.mockResolvedValue({ session, error: null })
    mockFinalize.mockRejectedValueOnce(new Error('Erreur lors de la création du profil'))
    render(<SignupConfirmationPage />)
    expect(await screen.findByText('Erreur lors de la création du profil')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
  })

  test('lien invalide → renvoi de l’email de confirmation', async () => {
    mockEstablish.mockResolvedValue({ session: null, error: 'expired' })
    mockAuth.resend.mockResolvedValue({ error: null })
    render(<SignupConfirmationPage />)
    expect(await screen.findByText('Lien de confirmation invalide')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jean@ex.fr' } })
    fireEvent.click(screen.getByRole('button', { name: /Renvoyer l'email de confirmation/ }))
    expect(await screen.findByText(/Un nouvel email de confirmation a été envoyé/)).toBeInTheDocument()
    expect(mockAuth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'jean@ex.fr' }))
  })
})

describe('PasswordChangeCard', () => {
  test('refuse moins de 8 caractères', async () => {
    render(<PasswordChangeCard />)
    fillPassword('Nouveau mot de passe', 'court')
    fillPassword('Confirmer le mot de passe', 'court')
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText(/au moins 8 caractères/)).toBeInTheDocument()
    expect(mockAuth.updateUser).not.toHaveBeenCalled()
  })

  test('change le mot de passe et confirme', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null })
    render(<PasswordChangeCard />)
    fillPassword('Nouveau mot de passe', 'nouveau-mdp')
    fillPassword('Confirmer le mot de passe', 'nouveau-mdp')
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText('Votre mot de passe a été modifié.')).toBeInTheDocument()
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'nouveau-mdp' })
  })
})
