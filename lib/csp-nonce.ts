/**
 * Utilitaires pour la génération et gestion des nonces CSP
 */

import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Génère un nonce alééatoire sécurisé pour le CSP
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // En utilisant crypto.randomUUID et en ajoutant des caractères aléatoires
    return crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).substring(2)
  }
  
  // Fallback pour les environnements sans crypto.randomUUID
  const array = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback ultime pour Node.js
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Récupère le nonce depuis les headers de la requête
 */
export async function getNonce(): Promise<string | undefined> {
  try {
    const headersList = await headers()
    return headersList.get('x-nonce') || undefined
  } catch (error) {
    // En cas d'erreur (ex: composant client), retourner undefined
    return undefined
  }
}

/**
 * Crée les headers CSP avec nonces pour une requête
 */
export function createCSPHeader(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // En développement, on garde des règles plus permissives pour le hot reload
  if (isDevelopment) {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`, // unsafe-eval nécessaire pour le hot reload
      "style-src 'self' 'unsafe-inline'", // Pas de nonce pour les styles en dev
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co ws: wss:", // ws/wss pour hot reload
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
  }
  
  // En production, CSP avec nonces pour scripts uniquement
  // Les styles utilisent unsafe-inline car trop de librairies (React, GTM, etc.) en ont besoin
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://tagmanager.google.com https://cdn-cookieyes.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn-cookieyes.com", // Pas de nonce pour les styles
    "img-src 'self' data: https: https://www.google-analytics.com https://www.googletagmanager.com https://cdn-cookieyes.com",
    "connect-src 'self' https://*.supabase.co https://region1.google-analytics.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.googletagmanager.com https://cookieyes.com https://cdn-cookieyes.com",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn-cookieyes.com",
    "frame-src 'self' https://www.googletagmanager.com https://cookieyes.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
}

/**
 * Ajoute un nonce à un élément script ou style
 */
export function addNonceToElement(element: string, nonce?: string): string {
  if (!nonce) return element
  
  // Pour les balises script
  if (element.includes('<script')) {
    return element.replace('<script', `<script nonce="${nonce}"`)
  }
  
  // Pour les balises style
  if (element.includes('<style')) {
    return element.replace('<style', `<style nonce="${nonce}"`)
  }
  
  return element
}

/**
 * Hook React pour récupérer le nonce côté client
 */
export function useNonce(): string | undefined {
  if (typeof window === 'undefined') {
    // Côté serveur, ne pas utiliser getNonce car elle est async
    return undefined
  }
  
  // Côté client, récupérer depuis les meta tags
  const metaNonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content')
  return metaNonce || undefined
}

/**
 * Validate qu'un nonce respecte les critères de sécurité
 */
export function validateNonce(nonce: string): boolean {
  // Un nonce doit faire au moins 16 caractères et contenir uniquement des caractères alphanumériques
  return /^[a-zA-Z0-9]{16,}$/.test(nonce)
}