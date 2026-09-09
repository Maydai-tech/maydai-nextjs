import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SystemCardPillarTab from '../SystemCardPillarTab'
import type { SystemCardPillar } from '@/lib/validations/system-card'

const mockGetAccessToken = jest.fn(() => 'test-token')

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken }),
}))

jest.mock('@/components/ComplianceFileUpload', () => ({
  __esModule: true,
  default: () => <div>upload-mock</div>,
}))

jest.mock('@/components/UploadedFileDisplay', () => ({
  __esModule: true,
  default: () => <div>file-mock</div>,
}))

const pillar: SystemCardPillar = {
  id: '11111111-1111-4111-8111-111111111111',
  system_card_id: '22222222-2222-4222-8222-222222222222',
  pillar_code: 'doc_technique',
  pillar_title: 'Documentation Technique du Système',
  sections_covered: 'Abstract',
  summary: 'Résumé d’audit',
  key_points: ['Point A'],
  ai_act_compliance: [
    {
      exigence: 'Documentation technique',
      article: 'Art. 53',
      application: 'Remplie',
      status: 'COMPLIANT',
    },
  ],
  recommendations: { fournisseur: 'Archiver' },
}

describe('SystemCardPillarTab', () => {
  const onUpdateSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAccessToken.mockReturnValue('test-token')
    global.fetch = jest.fn()
  })

  test('affiche la synthèse, la grille AI Act, les recommandations et les deux cartes empilées', () => {
    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId="44444444-4444-4444-8444-444444444444"
        pillar={pillar}
        maydaiApplied={false}
        userApplied={false}
        halfPoints={1.5}
        onFileSelected={jest.fn()}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    expect(screen.getByText('Résumé d’audit')).toBeInTheDocument()
    expect(screen.getByText('Conforme')).toBeInTheDocument()
    expect(screen.getByText(/Fournisseur/)).toBeInTheDocument()
    expect(screen.getByText('Archiver')).toBeInTheDocument()
    expect(screen.queryByText('Point A')).not.toBeInTheDocument()
    expect(screen.getByText('upload-mock')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Valider l'analyse MaydAI pour ce cas d'usage \(\+50 % des points\)/i,
      })
    ).toBeInTheDocument()
  })

  test('affiche l’état vide sans System Card', () => {
    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId={null}
        pillar={null}
        maydaiApplied={false}
        userApplied={false}
        halfPoints={1.5}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    expect(screen.getByText('Aucune System Card disponible pour ce modèle.')).toBeInTheDocument()
  })

  test('valide l’analyse MaydAI via l’API authentifiée', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStatus: 'incomplete' }),
    })

    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId="44444444-4444-4444-8444-444444444444"
        pillar={pillar}
        maydaiApplied={false}
        userApplied={false}
        halfPoints={1.5}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /Valider l'analyse MaydAI pour ce cas d'usage \(\+50 % des points\)/i,
      })
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/dossiers/pillar-completion',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      )
      expect(onUpdateSuccess).toHaveBeenCalled()
    })
  })

  test('affiche simultanément la carte entreprise (textarea, upload et bouton de validation)', () => {
    const onFileSelected = jest.fn()

    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId={null}
        pillar={pillar}
        maydaiApplied={true}
        userApplied={false}
        halfPoints={1.5}
        onFileSelected={onFileSelected}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    expect(
      screen.getByLabelText('Justification contextuelle / Mesures internes')
    ).toBeInTheDocument()
    expect(screen.getByText('upload-mock')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Valider les compléments entreprise \(\+50 % des points\)/i,
      })
    ).toBeInTheDocument()
  })

  test('retire l’analyse MaydAI via applyMaydaiPrefill false', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStatus: 'incomplete' }),
    })

    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId="44444444-4444-4444-8444-444444444444"
        pillar={pillar}
        maydaiApplied={true}
        userApplied={false}
        halfPoints={1.5}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    fireEvent.click(screen.getByTitle("Retirer l'analyse MaydAI et recalculer le score"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(JSON.parse(options.body)).toEqual(
      expect.objectContaining({
        applyMaydaiPrefill: false,
        pillarCode: 'doc_technique',
      })
    )
    expect(onUpdateSuccess).toHaveBeenCalled()
  })

  test('retire les compléments entreprise via applyUserCompletion false', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStatus: 'incomplete' }),
    })

    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId="44444444-4444-4444-8444-444444444444"
        pillar={pillar}
        maydaiApplied={true}
        userApplied={true}
        halfPoints={1.5}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    fireEvent.click(screen.getByTitle('Retirer les compléments et recalculer le score'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const [, options] = (global.fetch as jest.Mock).mock.calls[0]
    expect(JSON.parse(options.body)).toEqual(
      expect.objectContaining({
        applyUserCompletion: false,
        pillarCode: 'doc_technique',
      })
    )
    expect(onUpdateSuccess).toHaveBeenCalled()
  })

  test('affiche le badge 50 % avec les points dynamiques et le pluriel', () => {
    render(
      <SystemCardPillarTab
        usecaseId="33333333-3333-4333-8333-333333333333"
        dossierId="44444444-4444-4444-8444-444444444444"
        pillar={pillar}
        maydaiApplied={true}
        userApplied={true}
        halfPoints={2}
        onUpdateSuccess={onUpdateSuccess}
      />
    )

    expect(screen.getAllByText('+50 % validé (+2 pts)')).toHaveLength(2)
  })
})
