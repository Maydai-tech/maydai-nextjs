import { calculateProfileCompletenessScore } from '../profile-completeness'
import {
  calculateRegistryCompletenessScore,
  validateSectorConsistency,
} from '../registry-completeness'

describe('Scoring de Complétude - Moteur Isolé', () => {
  describe('Profile Completeness', () => {
    it('devrait retourner 0 pour un payload vide ou invalide', () => {
      expect(calculateProfileCompletenessScore({})).toBe(0)
      expect(calculateProfileCompletenessScore(null)).toBe(0)
    })

    it('devrait calculer correctement un score partiel', () => {
      // first_name (10) + last_name (10) + industry (15) = 35
      const score = calculateProfileCompletenessScore({
        first_name: 'John',
        last_name: 'Doe',
        industry: 'Tech',
      })
      expect(score).toBe(35)
    })

    it('devrait retourner 100 pour un profil complet avec collaborateurs', () => {
      const score = calculateProfileCompletenessScore({
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Acme',
        sub_category_id: 'sub_123',
        siren: '123456789',
        industry: 'Tech',
        phone: '0600000000',
        has_collaborators: true,
      })
      expect(score).toBe(100)
    })
  })

  describe('Registry Completeness', () => {
    it('devrait calculer correctement le score avec le flag centralisé (+10 points au lieu de 100 automatique)', () => {
      // Seulement is_centralized_registry (10)
      const score = calculateRegistryCompletenessScore({
        is_centralized_registry: true,
      })
      expect(score).toBe(10)
    })

    it('devrait calculer un score cumulatif standard', () => {
      // name (10) + country (10) + type (10) + is_centralized_registry (false) = 30
      const score = calculateRegistryCompletenessScore({
        name: 'Mon Registre',
        country: 'France',
        type: 'Interne',
        is_centralized_registry: false,
      })
      expect(score).toBe(30)
    })

    it('devrait retourner 100 uniquement si tous les champs sont remplis', () => {
      const score = calculateRegistryCompletenessScore({
        name: 'Mon Registre',
        industry: 'Tech',
        sub_category_id: 'sub_123',
        city: 'Paris',
        country: 'France',
        type: 'Interne',
        siren: '123456789',
        has_collaborators: true,
        is_centralized_registry: true,
      })
      expect(score).toBe(100)
    })
  })

  describe('Cohérence Sectorielle', () => {
    it('devrait retourner true si les secteurs correspondent', () => {
      const result = validateSectorConsistency('Tech', 'Tech')
      expect(result.isConsistent).toBe(true)
    })

    it('devrait retourner true si l un des secteurs est vide', () => {
      const result = validateSectorConsistency('Tech', '')
      expect(result.isConsistent).toBe(true)
    })

    it('devrait retourner false avec un flag explicite si divergence', () => {
      const result = validateSectorConsistency('Santé', 'Finance')
      expect(result.isConsistent).toBe(false)
      expect(result.flag).toContain('Santé')
      expect(result.flag).toContain('Finance')
    })
  })
})
