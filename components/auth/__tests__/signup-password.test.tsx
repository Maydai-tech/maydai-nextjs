import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockAuth = { signUp: jest.fn(), resend: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams('lead_id=lead-1&plan=pro'),
}))
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { alt: string }) => <img alt={props.alt} />,
}))
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))
jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return { auth: mockAuth }
  },
}))
jest.mock('@/lib/signup-finalize', () => ({
  PENDING_SIGNUP_KEY: 'pending_signup',
  computeEffectiveAttribution: () => null,
  acquisitionFields: () => ({}),
  finalizePendingSignup: jest.fn(),
}))
jest.mock('@/components/ui/SecurityLogosGrid', () => ({ __esModule: true, default: () => null }))
jest.mock('@/app/(marketing)/conformite-ia/hooks/useAIActCountdown', () => ({
  useAIActCountdown: () => ({ days: 10, label: 'jours', isPassed: false, isMounted: true }),
}))
jest.mock('@/components/CompanySectorSelector', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (v: { mainIndustryId: string; subCategoryId: string }) => void }) => (
    <button type="button" onClick={() => onChange({ mainIndustryId: 'tech', subCategoryId: 'saas' })}>
      choisir-secteur
    </button>
  ),
}))

import SignupPage from '@/app/(saas)/signup/SignupPage'

function fillStep1(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText(/Prénom/), { target: { value: 'Jean' } })
  fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Dupont' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'jean@ex.fr' } })
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: /Suivant/ }))
}

function submitStep2() {
  fireEvent.change(screen.getByLabelText(/Entreprise/), { target: { value: 'ACME' } })
  fireEvent.click(screen.getByText('choisir-secteur'))
  fireEvent.click(screen.getByLabelText(/J'accepte les/))
  fireEvent.click(screen.getByRole('button', { name: /Créer mon compte/ }))
}

describe('SignupPage (mot de passe)', () => {
  beforeEach(() => jest.clearAllMocks())

  test('bloque l’étape 1 si les mots de passe ne correspondent pas', () => {
    render(<SignupPage />)
    fillStep1('Motdepasse-2026', 'Motdepasse-2027')
    expect(screen.getByText(/ne correspondent pas/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Entreprise/)).not.toBeInTheDocument()
  })

  test('signUp avec mot de passe, lien de confirmation et profil en métadonnées', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    render(<SignupPage />)
    fillStep1('Motdepasse-2026', 'Motdepasse-2026')
    submitStep2()

    expect(await screen.findByText('Confirmez votre adresse email')).toBeInTheDocument()
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'jean@ex.fr',
      password: 'Motdepasse-2026',
      options: {
        emailRedirectTo: 'http://localhost/signup/confirmation',
        data: {
          pending_signup: {
            profile: {
              email: 'jean@ex.fr',
              firstName: 'Jean',
              lastName: 'Dupont',
              companyName: 'ACME',
              mainIndustryId: 'tech',
              subCategoryId: 'saas',
              planIntent: 'pro',
            },
            leadId: 'lead-1',
            attribution: null,
          },
          has_password: true,
        },
      },
    })

    mockAuth.resend.mockResolvedValue({ error: null })
    fireEvent.click(screen.getByRole('button', { name: /Renvoyer l'email/ }))
    await waitFor(() => expect(mockAuth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'jean@ex.fr' })))
  })

  test('email déjà confirmé (identities vide) → message compte existant', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    render(<SignupPage />)
    fillStep1('Motdepasse-2026', 'Motdepasse-2026')
    submitStep2()
    expect(await screen.findByText(/Un compte existe déjà/)).toBeInTheDocument()
  })
})
