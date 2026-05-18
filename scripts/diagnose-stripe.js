#!/usr/bin/env node

// Script de diagnostic Stripe
const Stripe = require('stripe')

async function diagnoseStripe() {
  try {
    // Charger les variables d'environnement
    require('dotenv').config({ path: '.env.local' })
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })

    console.log('🔍 Diagnostic Stripe...\n')

    // 1. Vérifier les produits
    console.log('📦 Produits existants :')
    const products = await stripe.products.list({ limit: 10 })
    
    for (const product of products.data) {
      console.log(`- ${product.name} (${product.id})`)
      
      // 2. Vérifier les prix pour chaque produit
      const prices = await stripe.prices.list({ 
        product: product.id,
        limit: 10 
      })
      
      for (const price of prices.data) {
        const amount = price.unit_amount ? (price.unit_amount / 100) : 0
        const interval = price.recurring ? `/${price.recurring.interval}` : ''
        console.log(`  └── ${amount}€${interval} → ${price.id}`)
      }
      console.log('')
    }

    // 3. Tester la création d'une session
    console.log('🧪 Test de création de session...')
    
    // Utiliser le premier prix trouvé
    const firstPrice = products.data[0] ? 
      (await stripe.prices.list({ product: products.data[0].id, limit: 1 })).data[0] : null
    
    if (firstPrice) {
      console.log(`Utilisation du prix : ${firstPrice.id}`)
      
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: firstPrice.id, quantity: 1 }],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      })
      
      console.log(`✅ Session créée : ${session.id}`)
    } else {
      console.log('❌ Aucun prix trouvé')
    }

  } catch (error) {
    console.error('❌ Erreur :', error.message)
  }
}

diagnoseStripe()
