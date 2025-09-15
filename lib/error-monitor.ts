/**
 * Système de monitoring des erreurs pour la génération de rapports
 */

export interface ErrorReport {
  id: string
  timestamp: string
  usecaseId: string
  errorType: 'validation' | 'openai' | 'database' | 'timeout' | 'unknown'
  errorMessage: string
  attempt: number
  maxAttempts: number
  processingTime?: number
  debugInfo?: any
}

export interface PerformanceMetrics {
  usecaseId: string
  timestamp: string
  processingTime: number
  success: boolean
  attempt: number
  reportLength?: number
}

class ErrorMonitor {
  private errors: ErrorReport[] = []
  private metrics: PerformanceMetrics[] = []
  private readonly maxLogs = 1000 // Limite de logs en mémoire

  /**
   * Enregistrer une erreur
   */
  logError(error: Omit<ErrorReport, 'id' | 'timestamp'>): void {
    const errorReport: ErrorReport = {
      ...error,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    }

    this.errors.push(errorReport)
    
    // Limiter le nombre de logs en mémoire
    if (this.errors.length > this.maxLogs) {
      this.errors = this.errors.slice(-this.maxLogs)
    }

    // Log dans la console avec formatage
    console.error('🚨 ERREUR MONITORÉE:', {
      id: errorReport.id,
      usecaseId: errorReport.usecaseId,
      type: errorReport.errorType,
      message: errorReport.errorMessage,
      tentative: `${errorReport.attempt}/${errorReport.maxAttempts}`,
      timestamp: errorReport.timestamp
    })

    // Log détaillé pour les erreurs critiques
    if (errorReport.errorType === 'openai' || errorReport.attempt === errorReport.maxAttempts) {
      console.error('🔍 DÉTAILS DE L\'ERREUR CRITIQUE:', errorReport.debugInfo)
    }
  }

  /**
   * Enregistrer des métriques de performance
   */
  logPerformance(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const performanceMetric: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    }

    this.metrics.push(performanceMetric)
    
    // Limiter le nombre de métriques en mémoire
    if (this.metrics.length > this.maxLogs) {
      this.metrics = this.metrics.slice(-this.maxLogs)
    }

    // Log des performances
    const status = performanceMetric.success ? '✅' : '❌'
    console.log(`${status} PERFORMANCE:`, {
      usecaseId: performanceMetric.usecaseId,
      temps: `${performanceMetric.processingTime}ms`,
      tentative: performanceMetric.attempt,
      succès: performanceMetric.success,
      taille: performanceMetric.reportLength ? `${performanceMetric.reportLength} caractères` : 'N/A'
    })
  }

  /**
   * Obtenir les erreurs récentes
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    return this.errors.slice(-limit)
  }

  /**
   * Obtenir les métriques récentes
   */
  getRecentMetrics(limit: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-limit)
  }

  /**
   * Obtenir les statistiques d'erreurs
   */
  getErrorStats(): {
    total: number
    byType: Record<string, number>
    byUsecase: Record<string, number>
    recentFailures: number
  } {
    const total = this.errors.length
    const byType: Record<string, number> = {}
    const byUsecase: Record<string, number> = {}
    
    // Erreurs des dernières 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentFailures = this.errors.filter(e => new Date(e.timestamp) > oneDayAgo).length

    this.errors.forEach(error => {
      byType[error.errorType] = (byType[error.errorType] || 0) + 1
      byUsecase[error.usecaseId] = (byUsecase[error.usecaseId] || 0) + 1
    })

    return {
      total,
      byType,
      byUsecase,
      recentFailures
    }
  }

  /**
   * Obtenir les statistiques de performance
   */
  getPerformanceStats(): {
    total: number
    successRate: number
    averageTime: number
    slowestRequests: PerformanceMetrics[]
  } {
    const total = this.metrics.length
    const successful = this.metrics.filter(m => m.success).length
    const successRate = total > 0 ? (successful / total) * 100 : 0
    const averageTime = total > 0 ? this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / total : 0
    
    // Les 10 requêtes les plus lentes
    const slowestRequests = [...this.metrics]
      .sort((a, b) => b.processingTime - a.processingTime)
      .slice(0, 10)

    return {
      total,
      successRate,
      averageTime,
      slowestRequests
    }
  }

  /**
   * Vérifier s'il y a des problèmes récurrents
   */
  checkForIssues(): {
    hasIssues: boolean
    issues: string[]
  } {
    const issues: string[] = []
    const stats = this.getErrorStats()
    const perfStats = this.getPerformanceStats()

    // Vérifier le taux d'erreur récent
    if (stats.recentFailures > 10) {
      issues.push(`Trop d'erreurs récentes: ${stats.recentFailures} dans les dernières 24h`)
    }

    // Vérifier le taux de succès
    if (perfStats.successRate < 80) {
      issues.push(`Taux de succès faible: ${perfStats.successRate.toFixed(1)}%`)
    }

    // Vérifier les performances
    if (perfStats.averageTime > 30000) {
      issues.push(`Temps de traitement élevé: ${Math.round(perfStats.averageTime)}ms en moyenne`)
    }

    // Vérifier les erreurs par type
    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > 5) {
        issues.push(`Trop d'erreurs de type ${type}: ${count}`)
      }
    })

    return {
      hasIssues: issues.length > 0,
      issues
    }
  }

  /**
   * Nettoyer les anciens logs
   */
  cleanup(olderThanDays: number = 7): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    
    this.errors = this.errors.filter(e => new Date(e.timestamp) > cutoffDate)
    this.metrics = this.metrics.filter(m => new Date(m.timestamp) > cutoffDate)
    
    console.log(`🧹 Nettoyage effectué: ${this.errors.length} erreurs et ${this.metrics.length} métriques conservées`)
  }

  /**
   * Exporter les données pour analyse
   */
  exportData(): {
    errors: ErrorReport[]
    metrics: PerformanceMetrics[]
    stats: {
      errors: ReturnType<ErrorMonitor['getErrorStats']>
      performance: ReturnType<ErrorMonitor['getPerformanceStats']>
    }
  } {
    return {
      errors: this.errors,
      metrics: this.metrics,
      stats: {
        errors: this.getErrorStats(),
        performance: this.getPerformanceStats()
      }
    }
  }
}

// Instance singleton
export const errorMonitor = new ErrorMonitor()

// Fonction utilitaire pour créer un rapport d'erreur
export function createErrorReport(
  usecaseId: string,
  errorType: ErrorReport['errorType'],
  errorMessage: string,
  attempt: number,
  maxAttempts: number,
  debugInfo?: any
): Omit<ErrorReport, 'id' | 'timestamp'> {
  return {
    usecaseId,
    errorType,
    errorMessage,
    attempt,
    maxAttempts,
    debugInfo
  }
}

// Fonction utilitaire pour créer des métriques de performance
export function createPerformanceMetrics(
  usecaseId: string,
  processingTime: number,
  success: boolean,
  attempt: number,
  reportLength?: number
): Omit<PerformanceMetrics, 'timestamp'> {
  return {
    usecaseId,
    processingTime,
    success,
    attempt,
    reportLength
  }
}
