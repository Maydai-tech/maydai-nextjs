/**
 * Compatibilité temporaire pour les imports historiques de formatage.
 * L'écran EcoLogits a été remplacé par /admin/bench-llms.
 */
export function formatImpactRange(
  min: number | null | undefined,
  max: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (typeof min !== 'number' || typeof max !== 'number') return 'Non disponible'
  const formatter = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 })
  return `${formatter.format(min)} – ${formatter.format(max)} ${unit ?? ''}`.trim()
}
