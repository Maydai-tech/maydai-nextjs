import {
  contactSiteSchema,
  evaluateBotTrap,
  hasBlacklistedTldInEmail,
  hasBlacklistedTldInText,
  isValidFrancophonePhone,
} from '@/lib/validations/contact'
import { defangUrlsForEmail, escapeHtml } from '@/lib/email/mailjet'

describe('Protection Anti-Bot & Anti-Phishing Formulaire Contact', () => {
  describe('1. Crash Test — Payload Phishing Benoit Henry', () => {
    it('rejette simultanément email @prodmail.online, téléphone ARCEP 0733826732 et lien partagepro.online', () => {
      const benoitHenryPayload = {
        subject: 'Partenariats & Fournisseurs',
        first_name: 'Benoit',
        last_name: 'Henry',
        email: 'bhenry@prodmail.online',
        phone: '0733826732',
        message:
          'Bonjour, voici notre cahier des charges consultable sur https://partagepro.online/dossier-maydai',
        marketing_consent: false,
      }

      const result = contactSiteSchema.safeParse(benoitHenryPayload)
      expect(result.success).toBe(false)

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        expect(fieldErrors.email).toBeDefined()
        expect(fieldErrors.phone).toBeDefined()
        expect(fieldErrors.message).toBeDefined()
      }
    })

    it('rejette un lien de phishing même sans préfixe https:// (domaine nu dans le message)', () => {
      expect(
        hasBlacklistedTldInText('Consultez notre document sur partagepro.online/doc'),
      ).toBe(true)
      expect(hasBlacklistedTldInText('Rendez-vous sur www.malicious-site.xyz')).toBe(true)
      expect(hasBlacklistedTldInEmail('contact@domaine.top')).toBe(true)
      expect(hasBlacklistedTldInEmail('bot@server.ru')).toBe(true)
    })
  })

  describe('2. Acceptation des Prospects B2B Légitimes (.fr, .com, .io & Francophonie)', () => {
    it('accepte un prospect B2B légitime avec une URL .fr, .com ou .io et un numéro français valide', () => {
      const validB2BPayload = {
        subject: 'Audit personnalisé',
        first_name: 'Claire',
        last_name: 'Martin',
        email: 'claire.martin@entreprise-ia.fr',
        phone: '+33 6 12 34 56 78',
        message:
          'Bonjour, nous développons https://app.entreprise-ia.fr et souhaitons auditer notre conformité AI Act (voir aussi https://maydai.io/usecases).',
        marketing_consent: true,
      }

      const result = contactSiteSchema.safeParse(validB2BPayload)
      expect(result.success).toBe(true)
    })

    it('valide correctement les numéros FR (ARCEP) et internationaux francophones (BE, CH, LU, CA)', () => {
      // France valides
      expect(isValidFrancophonePhone('06 12 34 56 78')).toBe(true)
      expect(isValidFrancophonePhone('07 55 12 34 56')).toBe(true)
      expect(isValidFrancophonePhone('+33 1 42 68 55 00')).toBe(true)

      // France invalides (ARCEP 073... / non attribués)
      expect(isValidFrancophonePhone('0733826732')).toBe(false)
      expect(isValidFrancophonePhone('+33 7 33 82 67 32')).toBe(false)
      expect(isValidFrancophonePhone('0701020304')).toBe(false)
      expect(isValidFrancophonePhone('0799887766')).toBe(false)

      // Francophonie (Belgique, Suisse, Luxembourg, Canada)
      expect(isValidFrancophonePhone('+32 470 12 34 56')).toBe(true)
      expect(isValidFrancophonePhone('+41 79 123 45 67')).toBe(true)
      expect(isValidFrancophonePhone('+352 621 123 456')).toBe(true)
      expect(isValidFrancophonePhone('+1 514 555 0199')).toBe(true)
    })
  })

  describe('3. Honeypot & Time-Trap (< 3000 ms)', () => {
    const baseTime = 1_700_000_000_000

    it('déclenche le trap si company_fax (honeypot) est rempli', () => {
      const check = evaluateBotTrap({
        companyFax: '0142000000',
        formLoadedAt: String(baseTime - 10_000),
        now: baseTime,
      })
      expect(check).toEqual({ isBot: true, reason: 'honeypot_filled' })
    })

    it('déclenche le trap si le formulaire est soumis en moins de 3000 ms', () => {
      const check = evaluateBotTrap({
        companyFax: '',
        formLoadedAt: String(baseTime - 1500),
        now: baseTime,
      })
      expect(check).toEqual({ isBot: true, reason: 'submitted_too_fast' })
    })

    it('autorise la soumission si company_fax est vide et le délai >= 3000 ms', () => {
      const check = evaluateBotTrap({
        companyFax: '',
        formLoadedAt: String(baseTime - 4500),
        now: baseTime,
      })
      expect(check).toEqual({ isBot: false })
    })
  })

  describe('4. Neutralisation (Defanging SOC/CERT) & Protection XSS Email Interne', () => {
    it('transforme les URLs en texte inerte hxxps://domaine[.]tld dans une balise <code> et échappe le HTML', () => {
      const maliciousMessage =
        'Cliquez sur https://partagepro.online/login?user=admin&x=<script>alert(1)</script> ou www.exemple.fr.'
      const safeHtml = defangUrlsForEmail(maliciousMessage)

      expect(safeHtml).toContain('hxxps://partagepro[.]online/login?user=admin&amp;x=&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(safeHtml).toContain('www.exemple[.]fr')
      expect(safeHtml).toContain('<code')
      expect(safeHtml).not.toContain('https://')
      expect(safeHtml).not.toContain('<script>')
      expect(safeHtml).not.toContain('<a ')
    })

    it('échappe correctement les balises HTML dans les champs standards', () => {
      expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
        '&lt;img src=x onerror=alert(1)&gt;',
      )
    })
  })
})
