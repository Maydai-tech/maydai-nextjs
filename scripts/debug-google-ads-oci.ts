import 'dotenv/config'
import { sendGoogleAdsConversion } from '../lib/google-ads/conversions'
import {
  GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME,
  GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_VALUE,
} from '../lib/google-ads/offline-signup-conversion'

/**
 * Script de test isolé (Dry Run) pour l'API Google Ads OCI.
 * Règle d'or MaydAI : Valider la normalisation et le payload sans altérer la donnée de prod.
 */
async function main() {
  console.log('[Debug OCI] Démarrage du test de conversion (validateOnly: true)...')

  // /!\ REMPLACE CECI PAR UN VRAI GCLID DE TA BASE DE DONNÉES /!\
  const realGclidFromDb = 'EAIaIQobChMI-uGB7ZXslAMVHpRQBh152R8tEAAYASAAEgL1QPD_BwE'
  
  const conversionName = GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_NAME

  // E-mail volontairement "sale" pour tester la normalisation stricte
  // Attendu après normalisation : jeandupont@gmail.com
  const testEmail = 'Jean.Dupont+promo123@Gmail.com'

  try {
    const success = await sendGoogleAdsConversion({
      clickId: realGclidFromDb,
      conversionName: conversionName,
      conversionValue: GOOGLE_ADS_OFFLINE_SIGNUP_CONVERSION_VALUE,
      currencyCode: 'EUR',
      email: testEmail,
      validateOnly: true, // Empêche l'enregistrement réel de la conversion
    })

    if (success) {
      console.log('✅ [Succès] Payload accepté par Google Ads en mode Dry Run.')
      console.log('Le GCLID est valide et le user_identifiers (hash) est bien formaté.')
    } else {
      console.error('❌ [Échec] Google Ads a rejeté le payload.')
    }
  } catch (error) {
    console.error('❌ [Erreur Fatale]', error)
  }
}

main()
