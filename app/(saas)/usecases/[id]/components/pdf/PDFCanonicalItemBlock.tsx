import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import {
  declarationStatusPdfLabel,
  evidenceStatusPdfLabel,
  LEGAL_TAXONOMY_SHORT,
} from '@/lib/report-canonical-items'
import { DECLARATION_PROOF_FLOW_COPY } from '@/lib/declaration-proof-flow-copy'
import { cleanPdfUrls } from '@/lib/pdf-payload-service'
import type { PdfCanonicalItem } from './types'
import { styles } from './styles'
import { SystemCardPdfSection } from './SystemCardPdfSection'

function absUrl(base: string | undefined, path: string): string {
  const b = (base || '').replace(/\/$/, '')
  return b ? `${b}${path}` : path
}

function pdfText(value: string | null | undefined): string {
  if (!value) return ''
  return cleanPdfUrls(value)
}

interface PDFCanonicalItemBlockProps {
  item: PdfCanonicalItem
  baseUrl?: string
}

export function PDFCanonicalItemBlock({ item, baseUrl }: PDFCanonicalItemBlockProps) {
  const todoLink = absUrl(baseUrl, item.cta.todoUrl)
  const dossierLink = absUrl(baseUrl, item.cta.dossierUrl)
  const ctaLine = cleanPdfUrls(
    item.cta.ctaOmitted
      ? 'Hors périmètre du questionnaire pour ce cas — aucune action en todo conformité n’est requise pour une question non posée.'
      : item.cta.completed
        ? `Mesure documentée dans le dossier du cas — ouvrir : ${dossierLink}`
        : `Action à mener : ${item.cta.label} — Todo conformité : ${todoLink} — Dossier du cas : ${dossierLink}`
  )

  return (
    <View style={{ marginBottom: 10 }} wrap>
      <Text style={[styles.text, { fontSize: 8, fontWeight: 'bold', marginBottom: 3 }]}>
        [{LEGAL_TAXONOMY_SHORT[item.legal.code]}] {declarationStatusPdfLabel(item.declaration.status)} —{' '}
        {evidenceStatusPdfLabel(item.evidence.status)}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 2 }]}>
        Mesure (catalogue) : {pdfText(item.identity.action_label)}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 2 }]}>
        Fondement : {pdfText(item.legal.basis_primary)}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 3, fontStyle: 'italic' }]}>
        Gouvernance : {pdfText(item.governance.rationale)}
      </Text>
      <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.35, marginBottom: 3 }]}>
        • {pdfText(item.narrative.text)}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, color: '#006280' }]}>{ctaLine}</Text>
      {item.cta.pointsLine ? (
        <Text style={[styles.text, { fontSize: 8, marginTop: 2 }]}>{pdfText(item.cta.pointsLine)}</Text>
      ) : (item.cta.points ?? 0) > 0 ? (
        <Text style={[styles.text, { fontSize: 8, marginTop: 2 }]}>
          {DECLARATION_PROOF_FLOW_COPY.reportPdfPointsToRecoverPrefix} : +{item.cta.points} pt
        </Text>
      ) : null}
      {item.cta.completed && (item.cta.points ?? 0) === 0 && !item.cta.ctaOmitted ? (
        <Text style={[styles.text, { fontSize: 8, marginTop: 2, color: '#334155' }]}>
          {DECLARATION_PROOF_FLOW_COPY.reportPdfValidatedNoPointsLine}
        </Text>
      ) : null}
      {item.systemCardSection ? (
        <View
          style={{
            borderTop: '1pt solid #E5E7EB',
            marginTop: 15,
            paddingTop: 15,
          }}
        >
          <SystemCardPdfSection
            pillar={item.systemCardSection.pillar}
            userNotes={item.systemCardSection.userNotes}
          />
        </View>
      ) : null}
    </View>
  )
}
