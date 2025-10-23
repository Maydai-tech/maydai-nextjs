import React from 'react'
import { Document, Font } from '@react-pdf/renderer'
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

// Configuration des polices système pour éviter les problèmes de chargement
Font.register({
  family: 'Helvetica',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2',
      fontWeight: 700,
    },
  ]
})

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

