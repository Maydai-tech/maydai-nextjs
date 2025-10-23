import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFReportData } from './types'

interface PDFDocumentSimpleProps {
  data: PDFReportData
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 12,
    marginBottom: 10,
  },
})

export const PDFDocumentSimple: React.FC<PDFDocumentSimpleProps> = ({ data }) => {
  return (
    <Document
      title={`Rapport d'Audit - ${data.useCase.name}`}
      author="MaydAI"
      subject="Rapport d'Audit Préliminaire du Système d'IA"
      creator="MaydAI Platform"
      producer="MaydAI"
      keywords="IA, AI Act, Conformité, Audit, MaydAI"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Rapport d'Audit IA</Text>
        <Text style={styles.text}>Nom du cas d'usage: {data.useCase.name}</Text>
        <Text style={styles.text}>Score: {data.score?.score || 0}</Text>
        <Text style={styles.text}>Niveau de risque: {data.riskLevel?.risk_level || 'limited'}</Text>
        <Text style={styles.text}>Date de génération: {data.generatedDate}</Text>
      </Page>
    </Document>
  )
}
