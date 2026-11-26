import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSignIn = jest.fn()
const mockSignInWithOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockRefreshSession = jest.fn()
let mockUser: { email?: string; user_metadata: Record<string, unknown> } | null = null
const mockAuth = {
  getSession: jest.fn(),
  resend: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
  signInWithPassword: jest.fn(),
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
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithOtp: mockSignInWithOtp,
    verifyOtp: mockVerifyOtp,
    refreshSession: mockRefreshSession,
    user: mockUser,
    loading: false,
  }),
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
  mockAuth.signOut.mockResolvedValue({ error: null })
  mockUser = null
  mockLoginMethod('password')
})

function mockLoginMethod(method: 'password' | 'code' | 'error') {
  global.fetch = jest.fn().mockResolvedValue(
    method === 'error' ? { ok: false, status: 500 } : { ok: true, json: async () => ({ method }) }
  ) as unknown as typeof fetch
}

/** Étape 1 : l'email (pré-rempli) puis « Continuer ». */
async function continueToPassword() {
  fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
  await screen.findByLabelText('Mot de passe')
}

function fillPassword(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('LoginPage (email puis mot de passe ou code)', () => {
  test('étape 1 : email pré-rempli, pas de champ mot de passe avant « Continuer »', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Email')).toHaveValue('jean@ex.fr')
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
    expect(screen.getByText('Créer un compte')).toHaveAttribute('href', '/signup?utm_source=login')
  })

  test('compte avec mot de passe (ou email inconnu) → écran mot de passe', async () => {
    render(<LoginPage />)
    await continueToPassword()
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login-method', expect.objectContaining({ body: JSON.stringify({ email: 'jean@ex.fr' }) }))
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
    expect(screen.getByText('Mot de passe oublié ?')).toHaveAttribute('href', '/login/mot-de-passe-oublie')
    const input = screen.getByLabelText('Mot de passe')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(screen.getByLabelText('Email')).toHaveValue('jean@ex.fr')
  })

  test('ancien compte → code envoyé puis connexion par code, sans mot de passe', async () => {
    mockLoginMethod('code')
    mockSignInWithOtp.mockResolvedValue({ error: null })
    mockVerifyOtp.mockResolvedValue({ error: null })
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(6))
    const digits = screen.getAllByRole('textbox')
    expect(mockSignInWithOtp).toHaveBeenCalledWith('jean@ex.fr', false)
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
    digits.forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 1) } }))
    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith('jean@ex.fr', '123456'))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
    expect(mockSendLoginEvent).toHaveBeenCalledWith('email')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  test('vérification de l’email impossible → message, on reste sur l’email', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockLoginMethod('error')
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    expect(await screen.findByText('Une erreur est survenue. Veuillez réessayer.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  test('connexion réussie → événement login puis tableau de bord', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    render(<LoginPage />)
    await continueToPassword()
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
    await continueToPassword()
    fillPassword('Mot de passe', 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalled())
    expect(mockFinalize).toHaveBeenCalledWith(pendingSession)
  })

  test('identifiants incorrects → message avec lien mot de passe oublié', async () => {
    mockSignIn.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
    render(<LoginPage />)
    await continueToPassword()
    fillPassword('Mot de passe', 'mauvais')
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    expect(await screen.findByText(/Email ou mot de passe incorrect/)).toBeInTheDocument()
    expect(screen.getAllByText('Mot de passe oublié ?')).toHaveLength(2)
    expect(mockPush).not.toHaveBeenCalled()
  })

  test('email non confirmé → renvoi de l’email de confirmation', async () => {
    mockSignIn.mockResolvedValue({ error: { code: 'email_not_confirmed', message: 'Email not confirmed' } })
    mockAuth.resend.mockResolvedValue({ error: null })
    render(<LoginPage />)
    await continueToPassword()
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
    await continueToPassword()
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

    fillPassword('Nouveau mot de passe', 'Motdepasse-2026')
    fillPassword('Confirmer le mot de passe', 'autre-chose')
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et me connecter/ }))
    expect(await screen.findByText(/ne correspondent pas/)).toBeInTheDocument()
    expect(mockAuth.updateUser).not.toHaveBeenCalled()

    fillPassword('Confirmer le mot de passe', 'Motdepasse-2026')
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer et me connecter/ }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/registries'))
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'Motdepasse-2026', data: { has_password: true } })
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'others' })
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
  test('refuse moins de 12 caractères', async () => {
    mockUser = { user_metadata: { has_password: true } }
    render(<PasswordChangeCard />)
    fillPassword('Mot de passe actuel', 'ancien-mdp')
    fillPassword('Nouveau mot de passe', 'court')
    fillPassword('Confirmer le mot de passe', 'court')
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText(/au moins 12 caractères/)).toBeInTheDocument()
    expect(mockAuth.updateUser).not.toHaveBeenCalled()
  })

  test('mot de passe actuel incorrect → refus, rien n’est modifié', async () => {
    mockUser = { email: 'jean@ex.fr', user_metadata: { has_password: true } }
    mockAuth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials', message: 'Invalid login credentials' } })
    render(<PasswordChangeCard />)
    fillPassword('Mot de passe actuel', 'mauvais')
    fillPassword('Nouveau mot de passe', 'Nouveau-mdp-2026')
    fillPassword('Confirmer le mot de passe', 'Nouveau-mdp-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText('Mot de passe actuel incorrect.')).toBeInTheDocument()
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'jean@ex.fr', password: 'mauvais' })
    expect(mockAuth.updateUser).not.toHaveBeenCalled()
  })

  test('change le mot de passe et confirme', async () => {
    mockUser = { email: 'jean@ex.fr', user_metadata: { has_password: true } }
    mockAuth.updateUser.mockResolvedValue({ error: null })
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })
    render(<PasswordChangeCard />)
    fillPassword('Mot de passe actuel', 'ancien-mdp')
    fillPassword('Nouveau mot de passe', 'Nouveau-mdp-2026')
    fillPassword('Confirmer le mot de passe', 'Nouveau-mdp-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Changer le mot de passe' }))
    expect(await screen.findByText('Votre mot de passe a été modifié.')).toBeInTheDocument()
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'Nouveau-mdp-2026', data: { has_password: true } })
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'others' })
  })

  test('ancien compte à code : définir un mot de passe est facultatif et pose le marqueur', async () => {
    mockUser = { user_metadata: {} }
    mockAuth.updateUser.mockResolvedValue({ error: null })
    render(<PasswordChangeCard />)
    expect(screen.getByText(/Facultatif/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument()
    fillPassword('Nouveau mot de passe', 'Nouveau-mdp-2026')
    fillPassword('Confirmer le mot de passe', 'Nouveau-mdp-2026')
    fireEvent.click(screen.getByRole('button', { name: 'Définir un mot de passe' }))
    expect(await screen.findByText(/Votre mot de passe est enregistré/)).toBeInTheDocument()
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'Nouveau-mdp-2026', data: { has_password: true } })
    expect(screen.getByRole('button', { name: 'Changer le mot de passe' })).toBeInTheDocument()
    expect(mockRefreshSession).toHaveBeenCalled()
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled()
  })
})
