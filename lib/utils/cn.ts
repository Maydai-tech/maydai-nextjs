/** Fusion de classes Tailwind (équivalent minimal à `cn` shadcn). */
export function cn(
  ...inputs: (string | undefined | null | false | 0)[]
): string {
  return inputs.filter(Boolean).join(' ')
}
