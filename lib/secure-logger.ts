/**
 * Système de logging sécurisé pour MaydAI
 * Évite l'exposition d'informations sensibles dans les logs
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  userId?: string
  companyId?: string
  useCaseId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  primary_model_id?: string
  url?: string
  score_final?: number
  [key: string]: any // Permet d'autres propriétés dynamiques
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  error?: any
  timestamp: string
  environment: string
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logLevel = process.env.LOG_LEVEL || 'info'

  /**
   * Nettoie les données sensibles d'un objet d'erreur
   */
  private sanitizeError(error: any): any {
    if (!error) return error

    // Copie de l'erreur sans références circulaires
    const sanitized: any = {}
    
    // Propriétés sûres à inclure
    if (error.message) sanitized.message = error.message
    if (error.name) sanitized.name = error.name
    if (error.code) sanitized.code = error.code
    if (error.status) sanitized.status = error.status
    
    // En développement, inclure la stack trace
    if (this.isDevelopment && error.stack) {
      sanitized.stack = error.stack
    }

    // Nettoyage spécifique aux erreurs Supabase
    if (error.details && typeof error.details === 'string') {
      // Masquer les détails SQL sensibles
      sanitized.details = error.details.replace(/\b\d+\b/g, '***')
    }

    return sanitized
  }

  /**
   * Nettoie le contexte pour éviter l'exposition de données sensibles
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined

    const sanitized: LogContext = {}
    
    // IDs sont OK à logger
    if (context.userId) sanitized.userId = context.userId.substring(0, 8) + '...'
    if (context.companyId) sanitized.companyId = context.companyId
    if (context.useCaseId) sanitized.useCaseId = context.useCaseId
    if (context.requestId) sanitized.requestId = context.requestId
    if (context.primary_model_id) sanitized.primary_model_id = context.primary_model_id
    
    // Informations réseau limitées
    if (context.userAgent) {
      sanitized.userAgent = context.userAgent.substring(0, 50) + '...'
    }
    if (context.ip) {
      // Masquer les derniers octets de l'IP
      sanitized.ip = context.ip.replace(/\.\d+$/, '.***')
    }
    if (context.url) {
      // Conserver l'URL mais masquer les paramètres sensibles
      sanitized.url = context.url.replace(/([?&][^=]+)=([^&]+)/g, '$1=***')
    }

    return sanitized
  }

  /**
   * Crée une entrée de log formatée
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: any
  ): LogEntry {
    return {
      level,
      message,
      context: this.sanitizeContext(context),
      error: this.sanitizeError(error),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
  }

  /**
   * Log une erreur de façon sécurisée
   */
  error(message: string, error?: any, context?: LogContext): void {
    const logEntry = this.createLogEntry('error', message, context, error)
    
    if (this.isDevelopment) {
      console.error('🚨 [ERROR]', logEntry)
    } else {
      // En production, logger sans détails sensibles
      console.error(JSON.stringify({
        level: 'error',
        message,
        context: logEntry.context,
        error: logEntry.error?.name || 'Unknown error',
        timestamp: logEntry.timestamp
      }))
    }
  }

  /**
   * Log un warning
   */
  warn(message: string, context?: LogContext): void {
    const logEntry = this.createLogEntry('warn', message, context)
    
    if (this.isDevelopment) {
      console.warn('⚠️ [WARN]', logEntry)
    } else {
      console.warn(JSON.stringify(logEntry))
    }
  }

  /**
   * Log une information
   */
  info(message: string, context?: LogContext): void {
    if (this.logLevel === 'error' || this.logLevel === 'warn') return
    
    const logEntry = this.createLogEntry('info', message, context)
    console.log(JSON.stringify(logEntry))
  }

  /**
   * Log de debug (uniquement en développement)
   */
  debug(message: string, data?: any, context?: LogContext): void {
    if (!this.isDevelopment || this.logLevel !== 'debug') return
    
    const logEntry = this.createLogEntry('debug', message, context, data)
    console.debug('🐛 [DEBUG]', logEntry)
  }

  /**
   * Log spécifique pour les actions admin
   */
  adminAction(
    action: string, 
    adminId: string, 
    targetId?: string, 
    details?: any,
    context?: LogContext
  ): void {
    const adminContext: LogContext = {
      ...context,
      userId: adminId,
      ...(targetId && { targetId })
    }

    this.info(`Admin action: ${action}`, adminContext)
    
    // En développement, afficher plus de détails
    if (this.isDevelopment && details) {
      this.debug(`Admin action details for ${action}`, details, adminContext)
    }
  }

  /**
   * Log des requêtes API avec métriques de performance
   */
  apiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`
    
    if (statusCode >= 400) {
      this.error(message, undefined, context)
    } else {
      this.info(message, context)
    }
  }
}

// Instance singleton
export const logger = new SecureLogger()

// Types utilitaires pour le contexte
export type { LogContext, LogLevel }

// Helper pour créer un contexte depuis une requête Next.js
export function createRequestContext(request: Request): LogContext {
  const url = new URL(request.url)
  
  return {
    requestId: crypto.randomUUID(),
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        undefined
  }
}

// Helper pour ajouter des métriques de performance
export function withPerformanceLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string,
  context?: LogContext
) {
  return async (...args: T): Promise<R> => {
    const start = Date.now()
    
    try {
      const result = await fn(...args)
      const duration = Date.now() - start
      
      logger.info(`${operationName} completed in ${duration}ms`, context)
      return result
    } catch (error) {
      const duration = Date.now() - start
      
      logger.error(
        `${operationName} failed after ${duration}ms`, 
        error, 
        context
      )
      throw error
    }
  }
}