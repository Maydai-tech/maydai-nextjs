import React from 'react'
import { Document } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { PDFCoverPage } from './PDFCoverPage'
import { PDFDashboardFixed } from './PDFDashboardFixed'
import { PDFSyntheseFixed } from './PDFSyntheseFixed'
import { PDFConformiteFixed } from './PDFConformiteFixed'
import { PDFRecommandationsFixed } from './PDFRecommandationsFixed'
import { PDFAnnexesFixed } from './PDFAnnexesFixed'

interface PDFDocumentProps {
  data: PDFReportData
}

export const PDFDocument: React.FC<PDFDocumentProps> = ({ data }) => {
  return (
    <Document
      title={`Rapport d'Audit - ${data.useCase.name}`}
      author="MaydAI"
      subject="Rapport d'Audit Préliminaire du Système d'IA"
      creator="MaydAI Platform"
      producer="MaydAI"
      keywords="IA, AI Act, Conformité, Audit, MaydAI"
    >
      {/* Page de couverture */}
      <PDFCoverPage data={data} />
      
      {/* Dashboard */}
      <PDFDashboardFixed data={data} />
      
      {/* Synthèse (2 pages) */}
      <PDFSyntheseFixed data={data} />
      
      {/* Conformité (2 pages) */}
      <PDFConformiteFixed data={data} />
      
      {/* Recommandations (2 pages) */}
      <PDFRecommandationsFixed data={data} />
      
      {/* Annexes (2 pages) */}
      <PDFAnnexesFixed data={data} />
    </Document>
  )
}

