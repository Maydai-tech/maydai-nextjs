import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import {
  getV3ShortPathFunnelCopy,
  resolveV3ShortPathFunnelOutcomeKey,
  type V3ShortPathFunnelOutcomeKey,
} from '../v3-short-path-funnel-context'

describe('resolveV3ShortPathFunnelOutcomeKey', () => {
  test('impossible prime sur tout risk_level', () => {
    expect(resolveV3ShortPathFunnelOutcomeKey('impossible', 'high')).toBe('impossible')
    expect(resolveV3ShortPathFunnelOutcomeKey('impossible', null)).toBe('impossible')
  })

  test('risk_level mappé en clés funnel (hors impossible)', () => {
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', 'minimal')).toBe('minimal')
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', 'limited')).toBe('limited')
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', 'high')).toBe('high')
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', 'unacceptable')).toBe('unacceptable')
  })

  test('risk insolite ou absent → qualified_neutral', () => {
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', null)).toBe('qualified_neutral')
    expect(resolveV3ShortPathFunnelOutcomeKey('qualified', 'unknown')).toBe('qualified_neutral')
  })
})

describe('getV3ShortPathFunnelCopy', () => {
  const keys: V3ShortPathFunnelOutcomeKey[] = [
    'impossible',
    'minimal',
    'limited',
    'high',
    'unacceptable',
    'qualified_neutral',
  ]

  test.each(keys)('%s : champs requis non vides', (key) => {
    const c = getV3ShortPathFunnelCopy(key)
    expect(c.contextualLead.length).toBeGreaterThan(20)
    expect(c.heroTitle.length).toBeGreaterThan(5)
    expect(c.primaryCtaLabel.length).toBeGreaterThan(5)
    expect(c.whyLongBullets.length).toBeGreaterThanOrEqual(3)
    expect(c.quickLinkPriority.length).toBe(4)
    expect(new Set(c.quickLinkPriority).size).toBe(4)
    expect(c.synthesisNextBestLine.length).toBeGreaterThan(10)
    expect(c.headerPrimaryCtaLabel.length).toBeGreaterThan(5)
    expect(c.headerResumeHint.length).toBeGreaterThan(10)
  })

  test('qualified_neutral reprend le hint header canonique', () => {
    const c = getV3ShortPathFunnelCopy('qualified_neutral')
    expect(c.headerResumeHint).toBe(DECLARATION_PROOF_FLOW_COPY.headerV3ResumeEvaluationHint)
  })

  test('impossible priorise todo en premier accès rapide', () => {
    expect(getV3ShortPathFunnelCopy('impossible').quickLinkPriority[0]).toBe('todo')
  })

  test('minimal met la synthèse (overview) en premier', () => {
    expect(getV3ShortPathFunnelCopy('minimal').quickLinkPriority[0]).toBe('overview')
  })
})
