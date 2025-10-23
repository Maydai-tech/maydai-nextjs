import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFConformiteProps {
  data: PDFReportData
}

export const PDFConformite: React.FC<PDFConformiteProps> = ({ data }) => {
  return (
    <>
      {/* Page 5: Obligations Spécifiques et Gouvernance */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          4. Obligations Spécifiques et Gouvernance
        </Text>
        
        <View style={[styles.card, { marginBottom: 15 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section détaille les obligations spécifiques et les mesures de gouvernance recommandées pour votre système d'IA.
          </Text>
          
          {/* Obligations selon le statut d'entreprise */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <View style={[styles.row, { marginBottom: 6 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0, fontSize: 12 }]}>
                Obligations selon votre statut d'entreprise
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.3, marginBottom: 6, fontSize: 9 }]}>
              Statut identifié : <Text style={styles.bold}>Distributeur</Text>
            </Text>
            <Text style={[styles.text, { lineHeight: 1.3, fontSize: 9 }]}>
              Une personne physique ou morale faisant partie de la chaîne d'approvisionnement, autre que le fournisseur ou l'importateur, qui met un système d'IA à disposition sur le marché de l'Union.
            </Text>
          </View>

          {/* Mesures de gouvernance recommandées */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Mesures de gouvernance recommandées
              </Text>
            </View>
            
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Organisation interne</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Désigner un responsable IA</Text>
                <Text style={styles.listItem}>• Créer un comité de gouvernance IA</Text>
                <Text style={styles.listItem}>• Établir des procédures de validation</Text>
                <Text style={styles.listItem}>• Former les équipes aux enjeux IA</Text>
              </View>
            </View>
            
            <View>
              <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Processus qualité</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Audits réguliers de conformité</Text>
                <Text style={styles.listItem}>• Tests de robustesse périodiques</Text>
                <Text style={styles.listItem}>• Monitoring des performances</Text>
                <Text style={styles.listItem}>• Gestion des incidents et remédiation</Text>
              </View>
            </View>
          </View>

          {/* Actions prioritaires */}
          <View style={[styles.cardWhite]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Actions prioritaires à mettre en œuvre
              </Text>
            </View>
            
            <View style={{ marginBottom: 15 }}>
              <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Actions immédiates (0-3 mois)</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Cartographier les systèmes d'IA existants</Text>
                <Text style={styles.listItem}>• Évaluer la conformité actuelle</Text>
                <Text style={styles.listItem}>• Identifier les lacunes critiques</Text>
                <Text style={styles.listItem}>• Mettre en place un système de monitoring</Text>
              </View>
            </View>
            
            <View>
              <Text style={[styles.text, styles.bold, { marginBottom: 8 }]}>Actions à moyen terme (3-12 mois)</Text>
              <View style={styles.list}>
                <Text style={styles.listItem}>• Développer la documentation technique</Text>
                <Text style={styles.listItem}>• Implémenter les mesures de transparence</Text>
                <Text style={styles.listItem}>• Renforcer les contrôles de qualité</Text>
                <Text style={styles.listItem}>• Former les équipes aux obligations réglementaires</Text>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={5} />
      </Page>

      {/* Page 6: Avertissements et Sanctions */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 20 }]}>
          6. Avertissements et Sanctions
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Le non-respect de l'AI Act peut entraîner des sanctions sévères.
          </Text>
          
          {/* Sanctions financières */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Sanctions financières
            </Text>
            
            <View style={styles.list}>
              <Text style={[styles.listItem, { marginBottom: 8 }]}>
                <Text style={styles.bold}>Violations des pratiques interdites (Article 5) :</Text>
              </Text>
              <Text style={[styles.text, { color: colors.primary, marginBottom: 12, marginLeft: 15 }]}>
                Amendes jusqu'à <Text style={styles.bold}>35 millions d'euros</Text> ou <Text style={styles.bold}>7% du chiffre d'affaires annuel mondial</Text> (le montant le plus élevé).
              </Text>
              
              <Text style={[styles.listItem, { marginBottom: 8 }]}>
                <Text style={styles.bold}>Violations des obligations pour les systèmes d'IA à haut risque :</Text>
              </Text>
              <Text style={[styles.text, { color: colors.primary, marginBottom: 12, marginLeft: 15 }]}>
                Amendes jusqu'à <Text style={styles.bold}>15 millions d'euros</Text> ou <Text style={styles.bold}>3% du chiffre d'affaires annuel mondial</Text>.
              </Text>
              
              <Text style={[styles.listItem, { marginBottom: 8 }]}>
                <Text style={styles.bold}>Fourniture d'informations inexactes, incomplètes ou trompeuses :</Text>
              </Text>
              <Text style={[styles.text, { color: colors.primary, marginLeft: 15 }]}>
                Amendes jusqu'à <Text style={styles.bold}>7,5 millions d'euros</Text> ou <Text style={styles.bold}>1% du chiffre d'affaires annuel mondial</Text>.
              </Text>
            </View>
          </View>

          {/* Calendrier de mise en œuvre avec timeline */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Calendrier de mise en œuvre
            </Text>
            
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={[styles.text, styles.bold, { marginBottom: 4 }]}>
                  2 février 2025
                </Text>
                <Text style={[styles.text, { lineHeight: 1.4 }]}>
                  Entrée en vigueur des interdictions des systèmes d'IA à « risque inacceptable ».
                </Text>
              </View>
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={[styles.text, styles.bold, { marginBottom: 4 }]}>
                  2 août 2026
                </Text>
                <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 4 }]}>
                  Application des réglementations pour les modèles d'IA à usage général (GPAI) et les règles de gouvernance. Les codes de bonnes pratiques ont été partagés le 5 juillet 2025.
                </Text>
              </View>
              
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <Text style={[styles.text, styles.bold, { marginBottom: 4 }]}>
                  2 août 2027
                </Text>
                <Text style={[styles.text, { lineHeight: 1.4 }]}>
                  Entrée en vigueur de toutes les autres dispositions de l'AI Act.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={6} />
      </Page>
    </>
  )
}