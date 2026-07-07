import { DECLARATION_PROOF_FLOW_COPY } from '../declaration-proof-flow-copy'

describe('declaration-proof-flow-copy', () => {
  it('expose un fil rouge et des libellés de liens non vides', () => {
    expect(DECLARATION_PROOF_FLOW_COPY.filRougeBody.length).toBeGreaterThan(40)
    expect(DECLARATION_PROOF_FLOW_COPY.linkLabelDossierCase).toContain('Dossier')
    expect(DECLARATION_PROOF_FLOW_COPY.linkLabelTodo).toContain('Todo')
    expect(DECLARATION_PROOF_FLOW_COPY.evidenceShortIncomplete).toBeTruthy()
    expect(DECLARATION_PROOF_FLOW_COPY.declarativeYes).toContain('Déclaré')
    expect(DECLARATION_PROOF_FLOW_COPY.declarativePdfNull).toContain('—')
    expect(DECLARATION_PROOF_FLOW_COPY.unacceptableStoppingProofTodo).toContain('documenter')
  })
})
