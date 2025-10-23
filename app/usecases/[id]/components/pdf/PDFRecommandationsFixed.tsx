import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFRecommandationsFixedProps {
  data: PDFReportData
}

export const PDFRecommandationsFixed: React.FC<PDFRecommandationsFixedProps> = ({ data }) => {
  return (
    <>
      {/* Page 7: Évaluation de la Conformité - Partie 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          6. Évaluation de la Conformité et Actions Recommandées
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section évalue la conformité du système d'IA aux exigences de l'AI Act, structurée autour des six principes éthiques et techniques clés. Pour chaque point, des quick wins (actions rapides) et des actions à mener sont proposées.
          </Text>
          
          {/* Introduction */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Introduction
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              {data.nextSteps?.introduction || `${data.useCase.companies?.name || 'L\'entreprise'} a prévu de déployer le ${data.useCase.deployment_date ? new Date(data.useCase.deployment_date).toLocaleDateString('fr-FR') : 'prochainement'} ${data.useCase.name}, un produit basé sur l'IA classé dans les ${data.useCase.ai_category || 'systèmes d\'IA'}. Ce cas d'usage, géré par le service ${data.useCase.responsible_service || 'le service concerné'}, utilise différents modèles dont ${data.useCase.compl_ai_models?.model_name || 'un modèle d\'IA'} de ${data.useCase.compl_ai_models?.model_provider || 'un fournisseur'} pour ${data.useCase.description || 'automatiser diverses tâches'}. Le déploiement concernera ${data.useCase.deployment_countries?.join(', ') || 'la France'}, pays membre de l'Union européenne, ce qui soumet ce cas d'usage à l'AI Act. L'évaluation de conformité indique un niveau de risque ${data.riskLevel?.risk_level || 'limited'}, impliquant des obligations spécifiques en matière de transparence et de gestion des risques.`}
            </Text>
          </View>

          {/* Évaluation du niveau de risque */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Évaluation du niveau de risque AI Act
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              {data.nextSteps?.evaluation || `Le niveau de risque de ${data.useCase.name} est classé comme ${data.riskLevel?.risk_level || 'limited'}. Cette évaluation repose sur l'analyse des réponses au questionnaire et des caractéristiques spécifiques du système d'IA. Les obligations réglementaires applicables dépendent de ce niveau de risque et des articles pertinents de l'AI Act.`}
            </Text>
          </View>

          {/* Priorités d'actions réglementaires */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 10, fontSize: 12 }]}>
              Il est impératif de mettre en œuvre les mesures suivantes :
            </Text>
            <Text style={[styles.text, styles.italic, { marginBottom: 10, fontSize: 9 }]}>
              Les 3 priorités d'actions réglementaires
            </Text>
            
            <View style={styles.list}>
              {data.nextSteps?.priorite_1 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.priorite_1}</Text>}
              {data.nextSteps?.priorite_2 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.priorite_2}</Text>}
              {data.nextSteps?.priorite_3 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.priorite_3}</Text>}
              {!data.nextSteps?.priorite_1 && !data.nextSteps?.priorite_2 && !data.nextSteps?.priorite_3 && (
                <>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Établir un système de gestion des risques pour {data.useCase.name} (Article 9 de l'AI Act).</Text>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Implémenter des procédures de vérification de la qualité des données (Article 10).</Text>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Documenter techniquement le système d'IA, en s'assurant de sa complétude et de sa conformité (Article 11 et Annexe IV).</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={7} />
      </Page>

      {/* Page 8: Évaluation de la Conformité - Partie 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          6. Évaluation de la Conformité et Actions Recommandées (suite)
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          {/* Quick wins */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Trois actions concrètes à mettre en œuvre rapidement :
            </Text>
            <Text style={[styles.text, styles.italic, { marginBottom: 10, fontSize: 9 }]}>
              Quick wins & actions immédiates recommandées
            </Text>
            
            <View style={styles.list}>
              {data.nextSteps?.quick_win_1 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.quick_win_1}</Text>}
              {data.nextSteps?.quick_win_2 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.quick_win_2}</Text>}
              {data.nextSteps?.quick_win_3 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.quick_win_3}</Text>}
              {!data.nextSteps?.quick_win_1 && !data.nextSteps?.quick_win_2 && !data.nextSteps?.quick_win_3 && (
                <>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Évaluer la conformité actuelle de {data.useCase.name} aux exigences de l'AI Act pour identifier les lacunes et prioriser les actions nécessaires.</Text>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Mettre à jour la documentation juridique pour refléter le rôle de {data.useCase.companies?.name || 'l\'entreprise'} en tant que {data.useCase.company_status} et les obligations qui en découlent, conformément à l'Article 3.</Text>
                </>
              )}
            </View>
          </View>

          {/* Actions à moyen terme */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Trois actions structurantes à mener dans les 3 à 6 mois :
            </Text>
            <Text style={[styles.text, styles.italic, { marginBottom: 10, fontSize: 9 }]}>
              Actions à moyen terme
            </Text>
            
            <View style={styles.list}>
              {data.nextSteps?.action_1 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.action_1}</Text>}
              {data.nextSteps?.action_2 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.action_2}</Text>}
              {data.nextSteps?.action_3 && <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• {data.nextSteps.action_3}</Text>}
              {!data.nextSteps?.action_1 && !data.nextSteps?.action_2 && !data.nextSteps?.action_3 && (
                <>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Établir un registre centralisé des systèmes d'IA utilisés par {data.useCase.companies?.name || 'l\'entreprise'}, conformément à l'Article 12, pour assurer une traçabilité et une conformité continues.</Text>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Mettre en place des mesures de supervision humaine pour garantir que les décisions automatisées respectent les droits des utilisateurs, conformément à l'Article 14.</Text>
                  <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.3 }]}>• Développer des politiques de transparence pour informer les utilisateurs sur les capacités et les limites de {data.useCase.name}, en respectant les exigences de l'Article 13.</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={8} />
      </Page>

      {/* Page 9: Recommandations Générales */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          7. Recommandations Générales
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section présente des recommandations générales pour améliorer la conformité et la gouvernance de votre système d'IA.
          </Text>
          
          {/* Intégration par design */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Intégration « par design »
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Intégrer les principes de l'AI Act dès la conception des produits et services IA pour assurer la pérennité et la compétitivité.
            </Text>
          </View>

          {/* Évaluation Continue */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Évaluation Continue
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              L'IA est une technologie en évolution rapide. Il est crucial de procéder à des évaluations régulières et d'adapter les systèmes et les processus de conformité en continu.
            </Text>
          </View>

          {/* Formation */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Formation
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Sensibiliser et former toutes les équipes (développement, juridique, conformité, gestion) aux exigences de l'AI Act et aux meilleures pratiques en matière d'IA éthique et transparente.
            </Text>
          </View>

          {/* Outils de Conformité */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Outils de Conformité
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Utiliser des boîtes à outils dédiées (telles que celles de MaydAI ou le cadre COMPL-AI) pour faciliter l'identification des systèmes, la classification des risques, la cartographie des obligations réglementaires et la gestion des risques.
            </Text>
          </View>

          {/* Bac à Sable Réglementaire */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Bac à Sable Réglementaire
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Envisager la participation à des « bacs à sable réglementaires » (regulatory sandboxes) pour développer et tester des systèmes d'IA innovants sous supervision réglementaire, ce qui peut renforcer la sécurité juridique et accélérer l'accès au marché pour les PME.
            </Text>
          </View>

          {/* Collaboration */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Collaboration
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Participer aux efforts de standardisation et de développement de codes de bonne pratique, encouragés par le Bureau de l'IA.
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={9} />
      </Page>
    </>
  )
}
