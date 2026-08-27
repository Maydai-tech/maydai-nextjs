/**
 * Équivalent JS de `public.normalize_llm_model_slug(text)`.
 * Minuscules, caractères non alphanumériques → tiret, tirets multiples collapsés.
 */
export function normalizeLlmModelSlug(input: string | null | undefined): string | null {
  if (input == null) return null
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || null
}
