import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'
import { SystemCardPdfSection } from './SystemCardPdfSection'

interface PDFSystemCardsFixedProps {
  data: PDFReportData
}

function chunkPillars<T>(items: T[], size: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

export function PDFSystemCardsFixed({ data }: PDFSystemCardsFixedProps) {
  const sections = data.systemCardSections ?? []
  if (sections.length === 0) return null

  const pages = chunkPillars(sections, 2)

  return (
    <>
      {pages.map((pageSections, pageIndex) => (
        <Page key={`system-cards-${pageIndex}`} size="A4" style={styles.page}>
          {pageIndex === 0 ? (
            <Text style={[styles.sectionTitle, { marginBottom: 12, fontSize: 16 }]}>
              Fiches d’audit MaydAI du modèle
            </Text>
          ) : null}
          {pageIndex === 0 ? (
            <Text style={[styles.text, { fontSize: 8, marginBottom: 10, color: colors.gray[600] }]}>
              Analyse GPAI issue des System Cards MaydAI pour le modèle associé à ce cas d’usage.
            </Text>
          ) : null}
          {pageSections.map((section) => (
            <View key={section.pillar.id}>
              <SystemCardPdfSection pillar={section.pillar} userNotes={section.userNotes} />
            </View>
          ))}
          <PDFFooter pageNumber={11 + pageIndex} />
        </Page>
      ))}
    </>
  )
}
