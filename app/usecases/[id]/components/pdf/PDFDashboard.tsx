import React from 'react'
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors, getScoreColor, getScoreStyle, riskLevelStyles } from './styles'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PDFFooter } from './PDFFooter'

interface PDFDashboardProps {
  data: PDFReportData
}

export const PDFDashboard: React.FC<PDFDashboardProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr })
    } catch {
      return 'Date non disponible'
    }
  }

  const formatDateShort = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return 'Date non disponible'
    }
  }

  // Trier et filtrer les scores par principes
  const categoryOrder = [
    'human_agency',
    'technical_robustness', 
    'privacy_data',
    'transparency',
    'diversity_fairness',
    'social_environmental'
  ]

  const sortedCategoryScores = data.score.category_scores
    ?.filter(category => 
      category.category_id !== 'risk_level' && 
      category.category_id !== 'prohibited_practices'
    )
    .sort((a, b) => {
      const indexA = categoryOrder.indexOf(a.category_id)
      const indexB = categoryOrder.indexOf(b.category_id)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    }) || []

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

  const getCategoryIcon = (categoryId: string) => {
    const icons: { [key: string]: string } = {
      'human_agency': '👁',
      'technical_robustness': '🧠',
      'privacy_data': '🔒',
      'transparency': '📄',
      'diversity_fairness': '⚖',
      'social_environmental': '🌱'
    }
    return icons[categoryId] || '📊'
  }

  const riskLevelStyle = riskLevelStyles[data.riskLevel.risk_level as keyof typeof riskLevelStyles] || riskLevelStyles.limited

  return (
    <Page size="A4" style={styles.page}>
      {/* Header avec titre et statut */}
      <View style={[styles.row, { marginBottom: 20, alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: 18, marginBottom: 5 }]}>
            🤖 {data.useCase.name || 'Application d\'automatisation LinkedIn'}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeSuccess]}>
          <Text style={{ color: colors.white, fontSize: 9 }}>Complété</Text>
        </View>
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

          {/* Score de conformité */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Score de conformité
            </Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(data.score.score) }]}>
              {Math.round(data.score.score)}
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
          {data.useCase.companies?.name || 'Addeus'} a prévu de déployer le{' '}
          {data.useCase.deployment_date ? formatDateShort(data.useCase.deployment_date) : '1er janvier 2026'}{' '}
          {data.useCase.name || 'une application d\'automatisation LinkedIn'}, un produit basé sur l'IA classé dans les logiciels métiers. 
          Ce cas d'usage, géré par le service {data.useCase.responsible_service || 'Marketing'}, utilise différents modèles dont{' '}
          <Text style={styles.bold}>
            {data.useCase.compl_ai_models?.model_name || 'GPT-4'} d'{data.useCase.compl_ai_models?.model_provider || 'OpenAI'}
          </Text>{' '}
          pour automatiser des tâches sur LinkedIn, comme l'envoi de messages ou la gestion de connexions. 
          Le déploiement concernera {data.useCase.deployment_countries?.join(', ') || 'la France'}, 
          pays membre de l'Union européenne, ce qui soumet ce cas d'usage à l'AI Act.
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
      </View>

      {/* Scores par principes */}
      <View style={[styles.card, { marginBottom: 20 }]}>
        <Text style={[styles.textLarge, styles.bold, { marginBottom: 15 }]}>
          Scores par principes
        </Text>
        
        {sortedCategoryScores.length > 0 ? (
          sortedCategoryScores.map((category, index) => {
            const scoreColor = getScoreColor(category.percentage)
            const scoreStyle = getScoreStyle(category.percentage)
            
            return (
              <View key={index} style={styles.principleScore}>
                <View style={styles.principleHeader}>
                  <View style={styles.row}>
                    <Text style={[styles.icon, { fontSize: 8, color: colors.primary }]}>•</Text>
                    <Text style={styles.principleName}>
                      {getCategoryName(category.category_id)}
                    </Text>
                  </View>
                  <Text style={[styles.principleValue, { color: scoreColor }]}>
                    {category.percentage}/100
                  </Text>
                </View>
                
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${Math.max(category.percentage, 2)}%`,
                        backgroundColor: scoreColor
                      }
                    ]} 
                  />
                </View>
              </View>
            )
          })
        ) : (
          <View style={[styles.table, { marginTop: 10 }]}>
            <View style={[styles.row, { backgroundColor: colors.gray[100] }]}>
              <Text style={[styles.tableHeader, { flex: 2, fontSize: 9 }]}>Principe</Text>
              <Text style={[styles.tableHeader, { flex: 1, fontSize: 9 }]}>Score</Text>
            </View>
            {categoryOrder.map((categoryId, index) => (
              <View key={index} style={[styles.row, { borderBottom: `1px solid ${colors.gray[200]}` }]}>
                <Text style={[styles.tableCell, { flex: 2, fontSize: 8 }]}>
                  {getCategoryIcon(categoryId)} {getCategoryName(categoryId)}
                </Text>
                    <Text style={[styles.tableCell, { flex: 1, fontSize: 8, textAlign: 'center', color: colors.primary }]}>
                      76
                    </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Détails techniques */}
      <View style={[styles.card]}>
        <Text style={[styles.textLarge, styles.bold, { marginBottom: 10 }]}>
          Détails techniques
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Catégorie IA :</Text>
            <Text style={styles.textSmall}>
              {data.useCase.ai_category || 'Large Language Model (LLM)'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Type de système :</Text>
            <Text style={styles.textSmall}>
              {data.useCase.system_type || 'Produit'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Service responsable :</Text>
            <Text style={styles.textSmall}>
              {data.useCase.responsible_service || 'Communication / Marketing'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.textSmall, styles.bold]}>Date de déploiement :</Text>
            <Text style={styles.textSmall}>
              {data.useCase.deployment_date ? formatDateShort(data.useCase.deployment_date) : '1 janvier 2026'}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer avec numéro de page */}
      <PDFFooter pageNumber={2} />
    </Page>
  )
}

