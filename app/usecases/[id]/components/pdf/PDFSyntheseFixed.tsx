import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData, getRiskLevelJustification, getCompanyStatusLabel, getCompanyStatusDefinition } from './types'
import { styles, colors, getScoreColor, riskLevelStyles } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFSyntheseFixedProps {
  data: PDFReportData
}

export const PDFSyntheseFixed: React.FC<PDFSyntheseFixedProps> = ({ data }) => {
  const riskLevelStyle = riskLevelStyles[data.riskLevel.risk_level as keyof typeof riskLevelStyles] || riskLevelStyles.limited

  return (
    <>
      {/* Page 3: Résumé et Statut */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          2. Résumé du Cas d'usage
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Ce rapport réalisé par l'entreprise <Text style={styles.bold}>{data.useCase.companies?.name || '[Nom de l\'entreprise]'}</Text> présente les conclusions d'un audit préliminaire du système d'IA <Text style={[styles.bold, { color: colors.primary }]}>{data.useCase.name || '[Nom du système]'}</Text> au regard des exigences du règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 établissant des règles harmonisées concernant l'intelligence artificielle « AI Act ».
          </Text>
          
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            <Text style={styles.bold}>Statut de l'entreprise :</Text> <Text style={{ color: colors.primary }}>{getCompanyStatusLabel(data.useCase.company_status)}</Text>
          </Text>
          
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Définition IA Act :</Text>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              {getCompanyStatusDefinition(data.useCase.company_status)}
            </Text>
          </View>
          
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            <Text style={styles.bold}>Résumé du cas d'usage :</Text> {data.useCase.description || '[Description du cas d\'usage]'}
          </Text>
          
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            L'objectif de cet audit préliminaire est d'identifier les domaines de conformité actuels et les lacunes, afin de proposer des actions correctives immédiates (quick wins) et des plans d'action à moyen et long terme, en soulignant les spécificités des grands modèles linguistiques (LLM) et de leur transparence.
          </Text>
          
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Une partie des conclusions de cette évaluation est basée sur les tests effectués par l'équipe MayDAI sur les principaux LLM dont <Text style={[styles.bold, { color: colors.primary }]}>{data.useCase.compl_ai_models?.model_name || data.useCase.llm_model_version || '[Nom du modèle utilisé]'}</Text>. Si certaines lacunes en matière de robustesse, de sécurité, de diversité et d'équité peuvent être relevées, d'autres informations demandées par l'AI Act ne sont pas encore disponibles (ou transmises par les technologies concernées).
          </Text>
          
          <Text style={[styles.text, { lineHeight: 1.6 }]}>
            Ce rapport constitue une première étape dans l'évaluation de la conformité de votre système d'IA aux exigences de l'AI Act. Il est recommandé de le compléter par une analyse plus approfondie et des tests supplémentaires avant le déploiement en production.
          </Text>
        </View>

        <PDFFooter pageNumber={3} />
      </Page>

      {/* Page 4: Classification et Scores */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          3. Classification du Système d'IA
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Cette section présente la classification du système d'IA selon les critères de l'AI Act et les scores de conformité obtenus.
          </Text>
          
          {/* Scores principaux */}
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreCard, { marginRight: 10 }]}>
              <Text style={[styles.textSmall, styles.bold, { marginBottom: 8 }]}>
                Niveau de risque
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

            <View style={[styles.scoreCard, { marginLeft: 10 }]}>
              <Text style={[styles.textSmall, styles.bold, { marginBottom: 8 }]}>
                Score de conformité
              </Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(data.score.score) }]}>
                {Math.round(data.score.score)}
              </Text>
            </View>
          </View>

          <View style={[styles.cardWhite, { marginTop: 20 }]}>
            <Text style={[styles.text, styles.bold, { marginBottom: 12 }]}>Justification du niveau de risque</Text>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              {getRiskLevelJustification(data.riskLevel.risk_level)}
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={4} />
      </Page>
    </>
  )
}
