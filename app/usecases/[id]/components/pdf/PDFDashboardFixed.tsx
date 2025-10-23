import React from 'react'
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors, getScoreColor, getScoreStyle, riskLevelStyles } from './styles'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PDFFooter } from './PDFFooter'

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

  const riskLevelStyle = riskLevelStyles[(data.riskLevel?.risk_level || 'limited') as keyof typeof riskLevelStyles] || riskLevelStyles.limited

  return (
    <Page size="A4" style={styles.page}>
      {/* Header avec titre et statut */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.title, { fontSize: 18, marginBottom: 5 }]}>
          {data.useCase.name || 'Application d\'automatisation LinkedIn'}
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

          {/* Score de conformité */}
          <View style={[styles.card, { marginBottom: 15 }]}>
            <Text style={[styles.textSmall, styles.bold, { marginBottom: 5 }]}>
              Score de conformité
            </Text>
              <Text style={[styles.scoreValue, { 
                color: getScoreColor(data.score?.score || 0), 
                textAlign: 'center' 
              }]}>
                {Math.round(data.score?.score || 0)}
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
                      {categoryScore ? `${categoryScore.percentage}` : 'N/A'}
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
                      {categoryScore ? `${categoryScore.percentage}` : 'N/A'}
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
