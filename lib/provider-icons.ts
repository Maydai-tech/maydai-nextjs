/**
 * Utilitaire pour récupérer l'icône appropriée d'un fournisseur de modèles IA
 */

/**
 * Mapping des noms de fournisseurs vers leurs icônes
 * Les icônes sont stockées dans /public/icons_providers/
 */
const PROVIDER_ICON_MAP: Record<string, string> = {
  'OpenAI': '/icons_providers/openai.svg',
  'Anthropic': '/icons_providers/anthropic.svg',
  'Google': '/icons_providers/google.svg',
  'Meta': '/icons_providers/meta.svg',
  'Mistral': '/icons_providers/mistral.svg',
  'Microsoft': '/icons_providers/microsoft.svg',
  'NVIDIA': '/icons_providers/nvidia.svg',
  'xAI': '/icons_providers/xai.svg',
  'DeepSeek': '/icons_providers/deepseek.webp',
  'Perplexity': '/icons_providers/Perplexity.png',
  'Qwen': '/icons_providers/qwen.webp',
  // Ajout des variantes de noms pour correspondre aux données COMPL-AI
  'Mistral AI': '/icons_providers/mistral.svg',
  'Alibaba': '/icons_providers/qwen.webp',
  '01.AI': '/icons_providers/deepseek.webp',
  'SpeakLeash': '/icons_providers/openai.svg', // Fallback vers OpenAI
}

/**
 * Icône par défaut si le fournisseur n'est pas reconnu
 */
const DEFAULT_PROVIDER_ICON = '/icons_providers/openai.svg'

/**
 * Récupère le chemin vers l'icône d'un fournisseur
 * @param providerName Nom du fournisseur (ex: "OpenAI", "Google")
 * @returns Chemin vers l'icône du fournisseur
 */
export function getProviderIcon(providerName?: string | null): string {
  if (!providerName) {
    return DEFAULT_PROVIDER_ICON
  }

  // Normalisation du nom pour gérer les variations de casse
  const normalizedName = providerName.trim()
  
  // Recherche exacte d'abord
  if (PROVIDER_ICON_MAP[normalizedName]) {
    return PROVIDER_ICON_MAP[normalizedName]
  }

  // Recherche insensible à la casse
  const lowerName = normalizedName.toLowerCase()
  for (const [key, value] of Object.entries(PROVIDER_ICON_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value
    }
  }

  // Recherche partielle pour gérer les variations de noms
  for (const [key, value] of Object.entries(PROVIDER_ICON_MAP)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return value
    }
  }

  // Si aucune correspondance trouvée, retourner l'icône par défaut
  return DEFAULT_PROVIDER_ICON
}

/**
 * Récupère la liste de tous les fournisseurs supportés
 * @returns Liste des noms de fournisseurs avec icônes disponibles
 */
export function getSupportedProviders(): string[] {
  return Object.keys(PROVIDER_ICON_MAP)
}