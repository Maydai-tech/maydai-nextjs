import { NextResponse } from 'next/server'
import type { ApiError } from '../types'

// Créer une réponse d'erreur standardisée
export function createErrorResponse(message: string, status: number = 500): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message },
    { status }
  )
}

// Gérer les erreurs Stripe spécifiques
export function handleStripeError(error: any): NextResponse<ApiError> {
  console.error('❌ Erreur Stripe:', error)

  // Erreur de configuration Stripe avec détails
  if (error.message?.includes('Impossible d\'initialiser le client Stripe')) {
    return createErrorResponse(`Configuration Stripe invalide: ${error.message}`, 500)
  }

  // Erreur de variable d'environnement manquante
  if (error.message?.includes('Variable d\'environnement manquante')) {
    return createErrorResponse(error.message, 500)
  }

  // Erreur de signature webhook
  if (error.message?.includes('signature')) {
    return createErrorResponse('Invalid signature', 400)
  }

  // Erreur Stripe API
  if (error.type && error.type.startsWith('Stripe')) {
    return createErrorResponse(`Erreur Stripe: ${error.message}`, 400)
  }

  // Erreur générique
  return createErrorResponse(`Erreur interne: ${error.message || 'Erreur inconnue'}`, 500)
}

// Gérer les erreurs de validation
export function handleValidationError(error: string): NextResponse<ApiError> {
  return createErrorResponse(error, 400)
}

// Gérer les erreurs de webhook
export function handleWebhookError(error: any): NextResponse<ApiError> {
  console.error('❌ Webhook error:', error)

  // Erreur de configuration Stripe
  if (error.message?.includes('Impossible d\'initialiser le client Stripe')) {
    return createErrorResponse('Configuration Stripe invalide', 500)
  }

  // Erreur générique de webhook
  return createErrorResponse('Webhook handler failed', 500)
}

// Logger les erreurs de manière cohérente
export function logError(context: string, error: any): void {
  console.error(`❌ ${context}:`, error)
}