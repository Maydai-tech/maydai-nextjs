import Stripe from 'stripe'

/**
 * Configuration requise pour initialiser Stripe
 */
interface StripeConfig {
  secretKey: string
  apiVersion: string
  appInfo?: {
    name: string
    version: string
    url: string
  }
}

/**
 * Informations sur l'application pour Stripe
 * Utile pour le support et le debugging côté Stripe
 */
const APP_INFO = {
  name: 'MaydAI',
  version: '1.0.0',
  url: 'https://maydai.io'
}

// ===== VARIABLES GLOBALES =====

/**
 * Instance singleton du client Stripe
 * Une fois initialisée, cette instance sera réutilisée partout
 */
let stripeClientInstance: Stripe | null = null

// ===== FONCTIONS DE VALIDATION =====

/**
 * Valide que toutes les variables d'environnement Stripe sont presentes
 * 
 * @throws {Error} Si une variable requise est manquante
 */
function validateEnvironmentVariables(): void {
  const requiredVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  }

  // Vérifier chaque variable requise
  for (const [varName, varValue] of Object.entries(requiredVars)) {
    if (!varValue) {
      throw new Error(
        `❌ Variable d'environnement manquante: ${varName}\n` +
        `Vérifiez votre fichier .env.local ou les variables Vercel`
      )
    }
  }

}

/**
 * Cree la configuration Stripe avec validation
 * 
 * @returns {StripeConfig} Configuration validee pour Stripe
 */
function createStripeConfig(): StripeConfig {
  // D'abord valider les variables
  validateEnvironmentVariables()

  return {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    apiVersion: '2025-08-27.basil', // Version API Stripe recommandée
    appInfo: APP_INFO
  }
}

// ===== FONCTION PRINCIPALE =====

/**
 * Cette fonction implemente le pattern Singleton :
 * - Si le client existe déjà → le retourne directement
 * - Si le client n'existe pas → le crée et le stocke
 * 
 * @returns {Stripe} Instance du client Stripe configuré
 * @throws {Error} Si la configuration est invalide
 */
export function getStripeClient(): Stripe {
  try {
    // Si le client existe déjà, le retourner (pattern Singleton)
    if (stripeClientInstance) {
      return stripeClientInstance
    }

    // Créer la configuration validée
    const config = createStripeConfig()

    // Créer et configurer l'instance Stripe
    stripeClientInstance = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion as Stripe.LatestApiVersion,
      appInfo: config.appInfo,
      // Configuration additionnelle pour la production
      maxNetworkRetries: 3, // Retry automatique en cas d'erreur réseau
      timeout: 10000 // Timeout de 10 secondes
    })

    return stripeClientInstance

  } catch (error) {
    // Log l'erreur pour le debugging
    console.error('❌ Erreur lors de l\'initialisation du client Stripe:', error)
    
    // Rethrow l'erreur avec un message plus clair
    throw new Error(
      `Impossible d'initialiser le client Stripe: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    )
  }
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Récupère la clé publique Stripe pour le frontend
 * 
 * @returns {string} Clé publique Stripe
 * @throws {Error} Si la clé n'est pas configurée
 */
export function getStripePublishableKey(): string {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error(
      '❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante\n' +
      'Cette clé est nécessaire pour le frontend Stripe'
    )
  }

  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}

export default getStripeClient
