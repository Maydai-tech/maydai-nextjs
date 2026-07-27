const NON_ALPHANUMERIC = /[^a-z0-9]+/g

const PROVIDER_ALIASES: Record<string, string> = {
  google: 'googlegenai',
  googleai: 'googlegenai',
  googledeepmind: 'googlegenai',
  googlegenai: 'googlegenai',
  mistralai: 'mistralai',
  mistral: 'mistralai',
  openai: 'openai',
  anthropic: 'anthropic',
}

export function normalizeEcoLogitsIdentifier(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(NON_ALPHANUMERIC, '')
}

export function normalizeEcoLogitsProvider(value: string): string {
  const normalized = normalizeEcoLogitsIdentifier(value)
  return PROVIDER_ALIASES[normalized] ?? normalized
}

export function exactEcoLogitsMatchKey(provider: string, name: string): string {
  return `${normalizeEcoLogitsProvider(provider)}:${normalizeEcoLogitsIdentifier(name)}`
}
