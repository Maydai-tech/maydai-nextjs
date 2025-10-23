import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFRecommandationsProps {
  data: PDFReportData
}

export const PDFRecommandations: React.FC<PDFRecommandationsProps> = ({ data }) => {
  return (
    <>
      {/* Page 7: Recommandations Spécifiques */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          5. Évaluation de la Conformité et Actions Recommandées
        </Text>
        
        <View style={[styles.card, { marginBottom: 15 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section évalue la conformité du système d'IA aux exigences de l'AI Act, structurée autour des six principes éthiques et techniques clés. Pour chaque point, des quick wins (actions rapides) et des actions à mener sont proposées.
          </Text>
          
          {/* Introduction */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Introduction
            </Text>
            <Text style={[styles.text, { lineHeight: 1.3, fontSize: 9 }]}>
              Addeus a prévu de déployer le 1er janvier 2026 une application d'automatisation LinkedIn, un produit basé sur l'IA classé dans les logiciels métiers. Ce cas d'usage, géré par le service Communication / Marketing, utilise différents modèles dont GPT-4 d'OpenAI pour automatiser des tâches sur LinkedIn, comme l'envoi de messages ou la gestion de connexions. Le déploiement concernera la France, pays membre de l'Union européenne, ce qui soumet ce cas d'usage à l'AI Act. L'évaluation de conformité indique un niveau de risque limité, impliquant des obligations spécifiques en matière de transparence et de gestion des risques.
            </Text>
          </View>

          {/* Évaluation du niveau de risque */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Évaluation du niveau de risque AI Act
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Le niveau de risque de l'application d'automatisation LinkedIn est classé comme limité. Cette évaluation repose sur le fait que le système interagit avec environ 200 utilisateurs par mois, ce qui implique des exigences de transparence et d'information des utilisateurs selon les Articles 50 et 52 de l'AI Act. Le manque de réponses à plusieurs questions concernant la gestion des risques et la qualité des données met en évidence le besoin d'amélioration de la conformité.
            </Text>
          </View>

          {/* Priorités d'actions réglementaires */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 12 }]}>
              Il est impératif de mettre en œuvre les mesures suivantes :
            </Text>
            <Text style={[styles.text, styles.italic, { marginBottom: 12 }]}>
              Les 3 priorités d'actions réglementaires
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}>• Établir un système de gestion des risques pour l'application d'automatisation LinkedIn (Article 9 de l'AI Act).</Text>
              <Text style={styles.listItem}>• Implémenter des procédures de vérification de la qualité des données (Article 10).</Text>
              <Text style={styles.listItem}>• Documenter techniquement le système d'IA, en s'assurant de sa complétude et de sa conformité (Article 11 et Annexe IV).</Text>
            </View>
          </View>

          {/* Quick wins */}
          <View style={[styles.cardWhite]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Trois actions concrètes à mettre en œuvre rapidement :
              </Text>
            </View>
            <Text style={[styles.text, styles.italic, { marginBottom: 12 }]}>
              Quick wins & actions immédiates recommandées
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}>• Évaluer la conformité actuelle de l'application d'automatisation LinkedIn aux exigences de l'AI Act pour identifier les lacunes et prioriser les actions nécessaires.</Text>
              <Text style={styles.listItem}>• Mettre à jour la documentation juridique pour refléter le rôle d'Addeus en tant que distributeur et les obligations qui en découlent, conformément à l'Article 3.</Text>
            </View>
          </View>
        </View>

        {/* Actions à moyen terme */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
            <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
              Trois actions structurantes à mener dans les 3 à 6 mois :
            </Text>
          </View>
          <Text style={[styles.text, styles.italic, { marginBottom: 12 }]}>
            Actions à moyen terme
          </Text>
          
          <View style={styles.list}>
            <Text style={styles.listItem}>• Établir un registre centralisé des systèmes d'IA utilisés par Addeus, conformément à l'Article 12, pour assurer une traçabilité et une conformité continues.</Text>
            <Text style={styles.listItem}>• Mettre en place des mesures de supervision humaine pour garantir que les décisions automatisées respectent les droits des utilisateurs, conformément à l'Article 14.</Text>
            <Text style={styles.listItem}>• Développer des politiques de transparence pour informer les utilisateurs sur les capacités et les limites de l'application, en respectant les exigences de l'Article 13.</Text>
          </View>
        </View>

        {/* Impact attendu */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
            <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
              Impact attendu
            </Text>
          </View>
          <Text style={[styles.text, { lineHeight: 1.4 }]}>
            La mise en œuvre de ces mesures permettra à Addeus de se conformer aux exigences de l'AI Act, réduisant ainsi les risques juridiques et améliorant la confiance des utilisateurs dans l'application d'automatisation LinkedIn. Cela contribuera également à protéger les droits fondamentaux des utilisateurs en garantissant une utilisation éthique et responsable de l'IA.
          </Text>
        </View>

        {/* Conclusion */}
        <View style={[styles.card]}>
          <Text style={[styles.subsectionTitle, { marginBottom: 12 }]}>
            Conclusion
          </Text>
          <Text style={[styles.text, { lineHeight: 1.4 }]}>
            Addeus doit agir rapidement pour se conformer aux exigences de l'AI Act concernant l'application d'automatisation LinkedIn. En mettant en œuvre les actions recommandées, l'entreprise pourra non seulement respecter la réglementation, mais aussi renforcer la confiance des utilisateurs et protéger leurs droits fondamentaux.
          </Text>
        </View>

        <PDFFooter pageNumber={7} />
      </Page>

      {/* Page 8: Recommandations Générales */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
          7. Recommandations Générales
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Les recommandations suivantes visent à accompagner l'entreprise dans sa démarche de conformité à l'AI Act et à promouvoir une utilisation éthique et responsable de l'intelligence artificielle.
          </Text>
          
          {/* Intégration par design */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Intégration « par design »
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Intégrer les principes de l'AI Act dès la conception des produits et services IA pour assurer la pérennité et la compétitivité.
            </Text>
          </View>

          {/* Évaluation Continue */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Évaluation Continue
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              L'AI est une technologie en évolution rapide. Il est crucial de procéder à des évaluations régulières et d'adapter les systèmes et les processus de conformité en continu.
            </Text>
          </View>

          {/* Formation */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Formation
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Sensibiliser et former toutes les équipes (développement, juridique, conformité, gestion) aux exigences de l'AI Act et aux meilleures pratiques en matière d'IA éthique et transparente.
            </Text>
          </View>

          {/* Outils de Conformité */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Outils de Conformité
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Utiliser des boîtes à outils dédiées (telles que celles de MaydAI ou le cadre COMPL-AI) pour faciliter l'identification des systèmes, la classification des risques, la cartographie des obligations réglementaires et la gestion des risques.
            </Text>
          </View>

          {/* Bac à Sable Réglementaire */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Bac à Sable Réglementaire
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 8 }]}>
              Envisager la participation à des « bacs à sable réglementaires » (regulatory sandboxes) pour développer et tester des systèmes d'IA innovants sous supervision réglementaire, ce qui peut renforcer la sécurité juridique et accélérer l'accès au marché pour les PME.
            </Text>
            <Text style={[styles.text, styles.textPrimary, { textDecoration: 'underline' }]}>
              En savoir plus sur les bacs à sable réglementaires
            </Text>
          </View>

          {/* Collaboration */}
          <View style={[styles.cardWhite]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Collaboration
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 8 }]}>
              Participer aux efforts de standardisation et de développement de codes de bonne pratique, encouragés par le Bureau de l'IA.
            </Text>
            <Text style={[styles.text, styles.textPrimary, { textDecoration: 'underline' }]}>
              Découvrir le Bureau de l'IA
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={8} />
      </Page>
    </>
  )
}

