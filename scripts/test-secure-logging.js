/**
 * Script de test pour le système de logging sécurisé
 */

// Simuler l'environnement Next.js
process.env.NODE_ENV = 'development'
process.env.LOG_LEVEL = 'debug'

// Mock crypto pour Node.js
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15)
  }
}

// Importer le logger
const { logger, createRequestContext } = require('../lib/secure-logger.ts')

console.log('🧪 Test du système de logging sécurisé\n')

// Test 1: Logging d'erreur avec données sensibles
console.log('1. Test logging d\'erreur avec données sensibles:')
const sensitiveError = new Error('Database connection failed')
sensitiveError.stack = 'Error: Database connection failed\n    at connect (/app/db.js:123:45)'
sensitiveError.code = 'ECONNREFUSED'

logger.error('Database connection failed', sensitiveError, {
  userId: 'user_1234567890abcdef',
  companyId: 'company_123',
  ip: '192.168.1.100'
})

console.log('\n')

// Test 2: Logging d'information normale
console.log('2. Test logging d\'information:')
logger.info('User login successful', {
  userId: 'user_1234567890abcdef',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

console.log('\n')

// Test 3: Logging d'action admin
console.log('3. Test logging d\'action admin:')
logger.adminAction(
  'promote_user_to_admin',
  'admin_12345',
  'user_67890',
  { previousRole: 'user', newRole: 'admin' }
)

console.log('\n')

// Test 4: Test en mode production
console.log('4. Test en mode production:')
const originalEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'production'

// Recharger le module pour prendre en compte le changement d'env
delete require.cache[require.resolve('../lib/secure-logger.ts')]
const { logger: prodLogger } = require('../lib/secure-logger.ts')

prodLogger.error('Production error test', new Error('Something went wrong'), {
  userId: 'user_production',
  ip: '203.0.113.1'
})

// Restaurer l'environnement
process.env.NODE_ENV = originalEnv

console.log('\n')

// Test 5: Mock d'une requête Next.js
console.log('5. Test avec contexte de requête Next.js:')
const mockRequest = {
  url: 'http://localhost:3000/api/companies',
  headers: {
    get: (name) => {
      const headers = {
        'user-agent': 'Next.js Test Agent',
        'x-forwarded-for': '10.0.0.1',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
      return headers[name.toLowerCase()]
    }
  }
}

const requestContext = createRequestContext(mockRequest)
logger.info('API request processed', requestContext)

console.log('\n✅ Tests du système de logging terminés')
console.log('\n📋 Vérifications:')
console.log('- Les erreurs en dev montrent la stack trace')
console.log('- Les erreurs en prod masquent les détails sensibles')
console.log('- Les IPs sont masquées (derniers octets)')
console.log('- Les User-Agents sont tronqués')
console.log('- Les User IDs sont raccourcis')
console.log('- Les actions admin sont loggées avec contexte')