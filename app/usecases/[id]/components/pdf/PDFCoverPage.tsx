import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFReportData, TableOfContentsItem } from './types'
import { styles, colors } from './styles'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PDFFooter } from './PDFFooter'

interface PDFCoverPageProps {
  data: PDFReportData
}

// Table des matières statique selon le modèle fourni
const tableOfContents: TableOfContentsItem[] = [
  {
    title: 'Synthèse',
    subsections: [
      { title: 'Aperçu et Scores', page: 2 },
      { title: 'Résumé et Statut', page: 3 },
      { title: 'Classification du système d\'IA', page: 4 }
    ]
  },
  {
    title: 'Conformité',
    subsections: [
      { title: 'Obligations et Gouvernance', page: 5 },
      { title: 'Avertissements et Sanctions', page: 6 }
    ]
  },
  {
    title: 'Actions',
    subsections: [
      { title: 'Recommandations Spécifiques', page: 7 },
      { title: 'Recommandations Générales', page: 9 }
    ]
  },
  {
    title: 'Annexes',
    subsections: [
      { title: 'Impact Environnemental', page: 10 },
      { title: 'Références Légales Clés', page: 11 }
    ]
  }
]

export const PDFCoverPage: React.FC<PDFCoverPageProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return format(new Date(), 'dd MMMM yyyy', { locale: fr })
    }
  }

  const reportDate = data.useCase.updated_at
    ? formatDate(data.useCase.updated_at)
    : formatDate(data.generatedDate)

  return (
    <Page size="A4" style={styles.page}>
      {/* Header avec logo MaydAI */}
      <View style={[styles.row, { marginBottom: 30, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { fontSize: 14, color: colors.primary, marginBottom: 0 }]}>
            MaydAI
          </Text>
        </View>
      </View>

      {/* Titre principal encadré */}
      <View style={{ 
        marginBottom: 30, 
        textAlign: 'center',
        border: `3px solid ${colors.primary}`,
        borderRadius: 8,
        padding: 12
      }}>
        <Text style={[styles.title, { textAlign: 'center', marginBottom: 8, fontSize: 18 }]}>
          Rapport d'Audit Préliminaire du Système d'IA :
        </Text>
        <Text style={[styles.title, { color: colors.primary, textAlign: 'center', fontSize: 18 }]}>
          {data.useCase.name || 'Nom du Cas d\'usage IA'}
        </Text>
      </View>

      {/* Métadonnées dans un tableau avec fond gris */}
      <View style={[styles.table, { marginBottom: 30 }]}>
        <View style={[styles.row, { backgroundColor: colors.gray[200], border: `1px solid ${colors.gray[300]}` }]}>
          <View style={[styles.tableHeader, { flex: 1, marginRight: 1, padding: 4 }]}>
            <Text style={[styles.text, styles.bold, { fontSize: 9 }]}>Entreprise :</Text>
          </View>
          <View style={[styles.tableHeader, { flex: 1, padding: 4 }]}>
            <Text style={[styles.text, styles.bold, { fontSize: 9 }]}>Audité par :</Text>
          </View>
        </View>
        <View style={[styles.row, { border: `1px solid ${colors.gray[300]}`, borderTop: 0 }]}>
          <View style={[styles.tableCell, { flex: 1, marginRight: 1, padding: 4 }]}>
            <Text style={[styles.text, { fontSize: 9 }]}>
              {data.useCase.companies?.name || 'Nom de l\'entreprise'}
            </Text>
          </View>
          <View style={[styles.tableCell, { flex: 1, padding: 4 }]}>
            <Text style={[styles.text, { fontSize: 9 }]}>
              {data.profile.email || 'thomas@mayday-consulting.ai'}
            </Text>
          </View>
        </View>
        <View style={[styles.row, { backgroundColor: colors.gray[200], border: `1px solid ${colors.gray[300]}`, borderTop: 0 }]}>
          <View style={[styles.tableHeader, { flex: 1, marginRight: 1, padding: 4 }]}>
            <Text style={[styles.text, styles.bold, { fontSize: 9 }]}>Date du Rapport :</Text>
          </View>
          <View style={[styles.tableHeader, { flex: 1, padding: 4 }]}>
            <Text style={[styles.text, styles.bold, { fontSize: 9 }]}>Service concerné :</Text>
          </View>
        </View>
        <View style={[styles.row, { border: `1px solid ${colors.gray[300]}`, borderTop: 0 }]}>
          <View style={[styles.tableCell, { flex: 1, marginRight: 1, padding: 4 }]}>
            <Text style={[styles.text, { fontSize: 9 }]}>{reportDate}</Text>
          </View>
          <View style={[styles.tableCell, { flex: 1, padding: 4 }]}>
            <Text style={[styles.text, { fontSize: 9 }]}>
              {data.useCase.responsible_service || 'Nom du service'}
            </Text>
          </View>
        </View>
      </View>

      {/* Table des matières */}
      <View style={[styles.toc, { marginTop: 10 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, textAlign: 'center', fontSize: 14 }]}>
          Chapitres du rapport :
        </Text>
        
            {tableOfContents.map((chapter, chapterIndex) => (
              <View key={chapterIndex} style={{ marginBottom: 6 }}>
                <Text style={[styles.subsectionTitle, { fontSize: 12, marginBottom: 4, color: colors.primary, fontWeight: 700 }]}>
                  {chapter.title} :
                </Text>

                {chapter.subsections?.map((subsection, subsectionIndex) => (
                  <View key={subsectionIndex} style={[styles.tocItem, { marginBottom: 2 }]}>
                    <Text style={[styles.tocTitle, { fontSize: 10 }]}>
                      {subsection.title}
                    </Text>
                    <Text style={[styles.tocPage, { fontSize: 10 }]}>
                      {'.'.repeat(35)} {subsection.page}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
      </View>

      {/* Footer avec numéro de page */}
      <PDFFooter pageNumber={1} />
    </Page>
  )
}
