export const REGISTRY_TYPES = [
  { value: 'entreprise', label: 'Une entreprise' },
  { value: 'filiale', label: 'Une filiale' },
  { value: 'service', label: 'Un service' },
] as const

export type RegistryTypeValue = typeof REGISTRY_TYPES[number]['value']

export const isCustomType = (type: string | null | undefined): boolean => {
  if (!type) return false
  return !REGISTRY_TYPES.some(t => t.value === type)
}

export const getTypeLabel = (type: string | null | undefined): string => {
  if (!type) return '-'
  const predefined = REGISTRY_TYPES.find(t => t.value === type)
  return predefined ? predefined.label : type
}
