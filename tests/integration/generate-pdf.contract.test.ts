type Case = {
  id: string
}

const CASES: Case[] = [
  { id: 'fd80b21b-7c07-4349-b3c2-1c78c666f44f' },
  { id: 'a695fb60-8309-4434-8168-ab5e3e6f5d78' },
  { id: '8cfabaec-d4fa-4268-8978-665f5aa90b8e' },
  { id: '18200ea4-38a5-421c-bc6e-8994ad475e33' },
  { id: '9b3857eb-f94c-4896-b41f-f18432f0a1e5' },
]

describe('Contrat API /api/usecases/:id/generate-pdf (anti-legacy)', () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const token = process.env.MAYDAI_REGRESSION_TOKEN

  test.each(CASES)('$id', async ({ id }) => {
    if (!token) {
      // Contrat "désactivé" faute de secrets (ne doit pas casser CI).
      expect(true).toBe(true)
      return
    }

    const response = await fetch(`${baseUrl}/api/usecases/${id}/generate-pdf`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(response.ok).toBe(true)

    const contentType = response.headers.get('content-type') || ''
    expect(contentType).toContain('application/pdf')

    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(1000)

    // Check anti-legacy markers.
    // Note: PDF est binaire; ces strings sont généralement présentes si hardcodées dans le template.
    const asText = Buffer.from(bytes).toString('latin1')
    expect(asText).not.toMatch(/Addeus/i)
    expect(asText).not.toMatch(/LinkedIn/i)
  }, 30000)
})

