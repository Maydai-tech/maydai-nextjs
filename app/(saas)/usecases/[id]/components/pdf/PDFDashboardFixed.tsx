import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors, getScoreColor, pdfRiskLevelUnavailableStyle, riskLevelStyles } from './styles'
import { resolvePdfRiskTierOrUnavailable } from './pdf-risk-logic'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PDFFooter } from './PDFFooter'
import { getPdfCanonicalDescription } from './pdf-content-utils'
import type { ActivityHistoryItem } from '@/lib/validations/pdf.schema'

interface PDFDashboardFixedProps {
  data: PDFReportData
}

export const PDFDashboardFixed: React.FC<PDFDashboardFixedProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr })
    } catch {
      return 'Date non disponible'
    }
  }

  const formatHistoryDate = (dateValue: string | Date) => {
    try {
      return format(new Date(dateValue), 'dd/MM/yyyy HH:mm', { locale: fr })
    } catch {
      return 'Date non disponible'
    }
  }

  const formatScoreImpactLabel = (impact: number): string => {
    const rounded = Math.round(impact)
    if (rounded === 0) return '0'
    return rounded > 0 ? `+${rounded}` : `${rounded}`
  }

  const getScoreImpactStyle = (impact: number) => {
    const rounded = Math.round(impact)
    if (rounded > 0) {
      return { backgroundColor: '#DCFCE7', color: '#166534' }
    }
    if (rounded < 0) {
      return { backgroundColor: '#FEE2E2', color: '#991B1B' }
    }
    return { backgroundColor: colors.gray[100], color: colors.gray[600] }
  }

  const formatNullableScore = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    return `${Math.round(value)}`
  }

  const scoreFinal = data.useCase.score_final ?? data.score?.score ?? null
  const scoreModel = data.useCase.score_model ?? null
  const activityHistory = data.useCase.history ?? []

  // Trier et filtrer les scores par principes
  const categoryOrder = [
    'human_agency',
    'technical_robustness', 
    'privacy_data',
    'transparency',
    'diversity_fairness',
    'social_environmental'
  ]

  const sortedCategoryScores = (data.score.category_scores || [])
    .filter(category => 
      category && 
      category.category_id !== 'risk_level' && 
      category.category_id !== 'prohibited_practices'
    )
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category_id)
      const indexB = categoryOrder.indexOf(b.category_id)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })

  const formatCategoryScoreCell = (categoryScore: { percentage: number; evaluation_status?: string } | undefined) => {
    if (!categoryScore) return 'N/A'
    if (categoryScore.evaluation_status === 'not_evaluated') return 'Non évalué'
    return `${categoryScore.percentage}`
  }

  const getCategoryName = (categoryId: string) => {
    const names: { [key: string]: string } = {
      'human_agency': 'Supervision Humaine',
      'technical_robustness': 'Robustesse Technique',
      'privacy_data': 'Confidentialité & Données',
      'transparency': 'Transparence',
      'diversity_fairness': 'Équité & Non-discrimination',
      'social_environmental': 'Impact Social & Environnemental'
    }
    return names[categoryId] || categoryId
  }

  const riskTier = resolvePdfRiskTierOrUnavailable(data.riskLevel?.risk_level)
  const riskLevelStyle =
    riskTier === 'unavailable' ? pdfRiskLevelUnavailableStyle : riskLevelStyles[riskTier]
  const canonicalDescription = getPdfCanonicalDescription(data)

  return (
    <Page size="A4" style={styles.page}>
      {/* Header avec titre et statut */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.title, { fontSize: 18, marginBottom: 5 }]}>
          {data.useCase.name || "Nom du Cas d'usage IA"}
        </Text>
      </View>

      {/* Informations principales en 2 colonnes */}
      <View style={[styles.row, { marginBottom: 25 }]}>
        {/* Colonne gauche - Modèle et pays */}
        <View style={{ flex: 1, marginRight: 15 }}>
          {/* Modèle utilisé */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Modèle utilisé
            </Text>
            <Text style={[styles.text, styles.bold]}>
              {data.useCase.compl_ai_models?.model_name || 'GPT-4'}
            </Text>
            <Text style={styles.textSmall}>
              {data.useCase.compl_ai_models?.model_provider || 'OpenAI'}
            </Text>
          </View>

          {/* Pays de déploiement */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Pays de déploiement
            </Text>
            {data.useCase.deployment_countries && data.useCase.deployment_countries.length > 0 ? (
              <Text style={styles.text}>
                {data.useCase.deployment_countries.join(', ')}
              </Text>
            ) : (
              <Text style={styles.text}>France</Text>
            )}
          </View>
        </View>

        {/* Colonne droite - Scores */}
        <View style={{ flex: 1, marginLeft: 15 }}>
          {/* Niveau IA Act */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Niveau IA Act
            </Text>
            <View style={[styles.badge, { 
              backgroundColor: riskLevelStyle.backgroundColor,
              marginBottom: 5
            }]}>
              <Text style={{ color: riskLevelStyle.color, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>
                {riskLevelStyle.label}
              </Text>
            </View>
          </View>

          {/* Score total */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Score total
            </Text>
            <Text style={[styles.scoreValue, {
              color: getScoreColor(scoreFinal ?? 0),
              textAlign: 'center',
            }]}>
              {formatNullableScore(scoreFinal)}
            </Text>
          </View>

          {/* Score du modèle */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Score du modèle
            </Text>
            <Text style={[styles.scoreValue, {
              color: scoreModel == null ? colors.gray[500] : getScoreColor(scoreModel),
              textAlign: 'center',
              fontSize: scoreModel == null ? 14 : undefined,
            }]}>
              {formatNullableScore(scoreModel)}
            </Text>
          </View>
        </View>
      </View>

      {/* Description du cas d'usage */}
      <View style={[styles.card, { marginBottom: 20 }]}>
        <Text style={[styles.textLarge, styles.bold, { marginBottom: 10 }]}>
          Description
        </Text>
        <Text style={[styles.text, { lineHeight: 1.5 }]}>
          {canonicalDescription}
        </Text>
      </View>

      {/* Suivi du cas d'usage */}
      <View style={[styles.card, { marginBottom: 25 }]}>
        <Text style={[styles.textLarge, styles.bold, { marginBottom: 10 }]}>
          Suivi du cas d'usage
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Première soumission :</Text>
            <Text style={styles.textSmall}>
              {formatDate(data.useCase.created_at)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Dernière mise à jour :</Text>
            <Text style={styles.textSmall}>
              {formatDate(data.useCase.updated_at)}
            </Text>
          </View>
        </View>

        {activityHistory.length > 0 ? (
          <View style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${colors.gray[200]}` }}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 8 }]}>
              Historique d'activité
            </Text>
            {activityHistory.map((entry: ActivityHistoryItem) => {
              const impactStyle = getScoreImpactStyle(entry.metadata.score_impact)
              return (
                <View
                  key={entry.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <Text style={[styles.textSmall, { width: 95, fontSize: 7, marginRight: 6 }]}>
                    {formatHistoryDate(entry.created_at)}
                  </Text>
                  <Text style={[styles.textSmall, { flex: 1, fontSize: 7, lineHeight: 1.3, marginRight: 6 }]}>
                    {entry.metadata.label}
                  </Text>
                  <View
                    style={{
                      backgroundColor: impactStyle.backgroundColor,
                      borderRadius: 10,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      minWidth: 28,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 7, color: impactStyle.color, fontFamily: 'Helvetica-Bold' }}>
                      {formatScoreImpactLabel(entry.metadata.score_impact)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        ) : null}
      </View>

      {/* Scores par principes - Tableau conditionnel */}
      <View style={[styles.card, { marginBottom: 5 }]}>
        <Text style={[styles.textLarge, styles.bold, { marginBottom: 8 }]}>
          Scores par principes
        </Text>
        
        {!data.score.is_eliminated ? (
          // Afficher le tableau si NON éliminé
          <View style={[styles.row, { marginTop: 5 }]}>
            {/* Colonne gauche */}
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={[styles.row, { backgroundColor: colors.gray[100], marginBottom: 3 }]}>
                <Text style={[styles.tableHeader, { flex: 2, fontSize: 7 }]}>Principe</Text>
                <Text style={[styles.tableHeader, { flex: 1, fontSize: 7 }]}>Score</Text>
              </View>
              {categoryOrder.slice(0, 3).map((categoryId, index) => {
                const categoryScore = (data.score.category_scores || []).find(
                  cat => cat && cat.category_id === categoryId
                )
                
                return (
                  <View key={index} style={[styles.row, { borderBottom: `1px solid ${colors.gray[200]}`, marginBottom: 2 }]}>
                    <Text style={[styles.tableCell, { flex: 2, fontSize: 6, lineHeight: 1.1 }]}>
                      {getCategoryName(categoryId)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, fontSize: 6, textAlign: 'center', color: colors.primary, lineHeight: 1.1 }]}>
                      {formatCategoryScoreCell(categoryScore)}
                    </Text>
                  </View>
                )
              })}
            </View>
            
            {/* Colonne droite */}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={[styles.row, { backgroundColor: colors.gray[100], marginBottom: 3 }]}>
                <Text style={[styles.tableHeader, { flex: 2, fontSize: 7 }]}>Principe</Text>
                <Text style={[styles.tableHeader, { flex: 1, fontSize: 7 }]}>Score</Text>
              </View>
              {categoryOrder.slice(3, 6).map((categoryId, index) => {
                const categoryScore = (data.score.category_scores || []).find(
                  cat => cat && cat.category_id === categoryId
                )
                
                return (
                  <View key={index} style={[styles.row, { borderBottom: `1px solid ${colors.gray[200]}`, marginBottom: 2 }]}>
                    <Text style={[styles.tableCell, { flex: 2, fontSize: 6, lineHeight: 1.1 }]}>
                      {getCategoryName(categoryId)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, fontSize: 6, textAlign: 'center', color: colors.primary, lineHeight: 1.1 }]}>
                      {formatCategoryScoreCell(categoryScore)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        ) : (
          // Afficher le message si éliminé
          <View style={{ 
            padding: 15, 
            backgroundColor: colors.gray[50], 
            borderRadius: 4,
            marginTop: 5 
          }}>
            <Text style={[
              styles.text, 
              styles.italic, 
              { 
                textAlign: 'center', 
                color: colors.gray[600],
                fontSize: 8,
                lineHeight: 1.4
              }
            ]}>
              Les scores détaillés par principe ne sont pas disponibles pour ce cas d'usage.
            </Text>
          </View>
        )}
      </View>

      <PDFFooter pageNumber={2} />
    </Page>
  )
}
