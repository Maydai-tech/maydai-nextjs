import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData, getCompanyStatusLabel, getCompanyStatusDefinition } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFConformiteFixedProps {
  data: PDFReportData
}

export const PDFConformiteFixed: React.FC<PDFConformiteFixedProps> = ({ data }) => {
  return (
    <>
      {/* Page 5: Obligations Spécifiques et Gouvernance */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          4. Obligations Spécifiques et Gouvernance
        </Text>
        
        <View style={[styles.card, { marginBottom: 8 }]}>
          <Text style={[styles.text, { lineHeight: 1.2, marginBottom: 8, fontSize: 8 }]}>
            Cette section détaille les obligations spécifiques et les mesures de gouvernance recommandées pour votre système d'IA.
          </Text>
          
          {/* Obligations selon le statut d'entreprise */}
          <View style={[styles.cardWhite, { marginBottom: 8 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 6, fontSize: 11 }]}>
              Obligations selon votre statut d'entreprise
            </Text>
            <Text style={[styles.text, { lineHeight: 1.2, marginBottom: 4, fontSize: 8 }]}>
              Statut identifié : <Text style={styles.bold}>{getCompanyStatusLabel(data.useCase.company_status)}</Text>
            </Text>
            <Text style={[styles.text, { lineHeight: 1.2, fontSize: 8 }]}>
              {getCompanyStatusDefinition(data.useCase.company_status)}
            </Text>
          </View>

          {/* Mesures de gouvernance recommandées */}
          <View style={[styles.cardWhite, { marginBottom: 12 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 6, fontSize: 11 }]}>
              Mesures de gouvernance recommandées
            </Text>
            
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.text, styles.bold, { marginBottom: 4, fontSize: 9 }]}>Organisation interne</Text>
              <View style={styles.list}>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Désigner un responsable IA</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Créer un comité de gouvernance IA</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Établir des procédures de validation</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Former les équipes aux enjeux IA</Text>
              </View>
            </View>
            
            <View>
              <Text style={[styles.text, styles.bold, { marginBottom: 4, fontSize: 9 }]}>Processus qualité</Text>
              <View style={styles.list}>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Audits réguliers de conformité</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Tests de robustesse périodiques</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Monitoring des performances</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Gestion des incidents et remédiation</Text>
              </View>
            </View>
          </View>

          {/* Actions prioritaires */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 6, fontSize: 11 }]}>
              Actions prioritaires à mettre en œuvre
            </Text>
            
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.text, styles.bold, { marginBottom: 4, fontSize: 9 }]}>Actions immédiates (0-3 mois)</Text>
              <View style={styles.list}>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Cartographier les systèmes d'IA existants</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Évaluer la conformité actuelle</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Identifier les lacunes critiques</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Mettre en place un système de monitoring</Text>
              </View>
            </View>
            
            <View>
              <Text style={[styles.text, styles.bold, { marginBottom: 4, fontSize: 9 }]}>Actions à moyen terme (3-12 mois)</Text>
              <View style={styles.list}>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Développer la documentation technique</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Implémenter les mesures de transparence</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Renforcer les contrôles de qualité</Text>
                <Text style={[styles.listItem, { fontSize: 8 }]}>• Former les équipes aux obligations réglementaires</Text>
              </View>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={5} />
      </Page>

      {/* Page 6: Avertissements et Sanctions */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          5. Avertissements et Sanctions
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section présente les conséquences en cas de non-conformité aux exigences de l'AI Act.
          </Text>
          
          {/* Avertissement */}
          <View style={[styles.cardWhite, { marginBottom: 20, padding: 15 }]}>
            <Text style={[styles.text, styles.bold, { marginBottom: 8, color: colors.gray[900], fontSize: 10 }]}>
              Avertissement Important
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, color: colors.gray[900], fontSize: 9 }]}>
              Le non-respect des obligations de l'AI Act peut entraîner des sanctions financières importantes et des conséquences juridiques. Il est essentiel de mettre en œuvre les mesures recommandées dans ce rapport avant le déploiement en production.
            </Text>
          </View>

          {/* Sanctions financières */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 12, fontSize: 12 }]}>
              Sanctions financières
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Jusqu'à 7,5 millions d'euros ou 1,5% du chiffre d'affaires annuel mondial</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Sanctions proportionnelles à la gravité de l'infraction</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Possibilité de sanctions cumulatives pour plusieurs infractions</Text>
            </View>
          </View>

          {/* Calendrier d'application */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 12, fontSize: 12 }]}>
              Calendrier d'application
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• 2 février 2025 : Interdictions (Article 5)</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• 2 août 2026 : Systèmes à haut risque</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• 2 février 2027 : Systèmes à risque limité</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• 2 août 2027 : Modèles d'IA à usage général</Text>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={6} />
      </Page>
    </>
  )
}
