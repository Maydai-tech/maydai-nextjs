import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors, getScoreColor, riskLevelStyles } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFSyntheseProps {
  data: PDFReportData
}

export const PDFSynthese: React.FC<PDFSyntheseProps> = ({ data }) => {
  const riskLevelStyle = riskLevelStyles[data.riskLevel.risk_level as keyof typeof riskLevelStyles] || riskLevelStyles.limited

  return (
    <>
      {/* Page 3: Résumé et Statut */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
          2. Résumé du Cas d'usage
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Ce rapport réalisé par l'entreprise <Text style={styles.bold}>{data.useCase.companies?.name || '[Nom de l\'entreprise]'}</Text> présente les conclusions d'un audit préliminaire du système d'IA <Text style={[styles.bold, { color: colors.primary }]}>{data.useCase.name || '[Nom du système]'}</Text> au regard des exigences du règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 établissant des règles harmonisées concernant l'intelligence artificielle « AI Act ».
          </Text>
          
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            <Text style={styles.bold}>Statut de l'entreprise :</Text> <Text style={{ color: colors.primary }}>Distributeur</Text>
          </Text>
          
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Définition IA Act :</Text>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Une personne physique ou morale faisant partie de la chaîne d'approvisionnement, autre que le fournisseur ou l'importateur, qui met un système d'IA à disposition sur le marché de l'Union.
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
            Ce rapport vise à fournir une feuille de route aux entreprises pour naviguer dans ce paysage réglementaire complexe.
          </Text>
        </View>

        <PDFFooter pageNumber={3} />
      </Page>

      {/* Page 4: Classification du système d'IA */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
          3. Classification du système d'IA
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            L'AI Act adopte une approche fondée sur les risques, classifiant les systèmes d'IA en différentes catégories selon leur niveau de risque. Cette classification détermine les obligations réglementaires applicables.
          </Text>
          
          {/* Badges de classification et score */}
          <View style={styles.scoreContainer}>
            {/* Badge Niveau IA Act */}
            <View style={[styles.scoreCard, { marginRight: 10 }]}>
              <Text style={[styles.textSmall, styles.bold, { marginBottom: 8 }]}>
                Niveau IA Act
              </Text>
              <View style={[styles.badge, { 
                backgroundColor: riskLevelStyle.backgroundColor,
                marginBottom: 8
              }]}>
                <Text style={{ color: riskLevelStyle.color, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>
                  {riskLevelStyle.label}
                </Text>
              </View>
            </View>

            {/* Badge Score de conformité */}
            <View style={[styles.scoreCard, { marginLeft: 10 }]}>
              <Text style={[styles.textSmall, styles.bold, { marginBottom: 8 }]}>
                Score de conformité
              </Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(data.score.score) }]}>
                {Math.round(data.score.score)}
              </Text>
            </View>
          </View>
          
          {/* Justification du niveau de risque */}
          <View style={[styles.cardWhite, { marginTop: 20 }]}>
            <Text style={[styles.text, styles.bold, { marginBottom: 12 }]}>Justification du niveau de risque</Text>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Les systèmes d'IA à risque limité sont ceux pour lesquels il existe un besoin spécifique de transparence. La justification principale de cette classification est d'assurer que les utilisateurs soient informés lorsqu'ils interagissent avec une IA, en particulier s'il existe un risque manifeste de manipulation. Cela inclut les applications comme les chatbots, où les utilisateurs doivent savoir qu'ils communiquent avec une machine pour prendre des décisions éclairées. Cette catégorie englobe également les systèmes d'IA générative qui produisent des contenus synthétiques (audio, images, vidéo ou texte) ; les fournisseurs doivent s'assurer que ces contenus sont marqués de manière lisible par machine et identifiables comme étant générés ou manipulés par une IA. De même, les déployeurs de systèmes de reconnaissance des émotions ou de catégorisation biométrique doivent informer les personnes exposées de leur fonctionnement, et ceux qui utilisent l'IA pour générer des hyper trucages doivent clairement indiquer que le contenu a été créé ou manipulé par une IA. Ces exigences de transparence visent à préserver la confiance et à lutter contre les risques de manipulation, de tromperie et de désinformation.
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={4} />
      </Page>
    </>
  )
}