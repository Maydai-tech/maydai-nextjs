import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import type { AiActComplianceItem, SystemCardPillar } from '@/lib/validations/system-card'
import { colors, fonts } from './styles'
import { formatComplianceStatusForPdf } from './pdf-content-utils'

const sectionStyles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 15,
    padding: 10,
    border: '1pt solid #E2E8F0',
    borderRadius: 4,
  },
  title: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    color: colors.gray[500],
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 9,
    color: colors.gray[700],
    marginBottom: 8,
    lineHeight: 1.3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderBottom: '1pt solid #E2E8F0',
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #F1F5F9',
    padding: 4,
  },
  colExigence: { width: '25%', fontSize: 8, fontFamily: fonts.bold },
  colArticle: { width: '20%', fontSize: 8, color: colors.gray[500] },
  colApp: { width: '40%', fontSize: 8, color: colors.gray[700] },
  colStatus: { width: '15%', fontSize: 8, textAlign: 'right' },
  notesBox: {
    marginTop: 6,
    paddingTop: 4,
    borderTop: '0.5pt solid #E2E8F0',
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: fonts.bold,
    color: colors.gray[900],
  },
  notesText: {
    fontSize: 8,
    color: colors.gray[700],
    marginTop: 2,
  },
})

function statusColor(status: string): string {
  switch (status) {
    case 'COMPLIANT':
      return colors.success
    case 'PARTIAL':
      return colors.warning
    case 'NON_COMPLIANT':
      return colors.error
    default:
      return colors.gray[700]
  }
}

interface SystemCardPdfSectionProps {
  pillar: SystemCardPillar
  userNotes?: string
}

export function SystemCardPdfSection({ pillar, userNotes }: SystemCardPdfSectionProps) {
  return (
    <View style={sectionStyles.sectionContainer}>
      <Text style={sectionStyles.title}>Fiche d’audit MaydAI — {pillar.pillar_title}</Text>
      <Text style={sectionStyles.subtitle}>Sections analysées : {pillar.sections_covered}</Text>
      <Text style={sectionStyles.summaryText}>{pillar.summary}</Text>

      <View style={sectionStyles.tableHeader}>
        <Text style={sectionStyles.colExigence}>Exigence</Text>
        <Text style={sectionStyles.colArticle}>Article</Text>
        <Text style={sectionStyles.colApp}>Application modèle</Text>
        <Text style={sectionStyles.colStatus}>Statut</Text>
      </View>
      {pillar.ai_act_compliance.map((item: AiActComplianceItem, idx: number) => (
        <View key={`${item.article}-${idx}`} style={sectionStyles.tableRow}>
          <Text style={sectionStyles.colExigence}>{item.exigence}</Text>
          <Text style={sectionStyles.colArticle}>{item.article}</Text>
          <Text style={sectionStyles.colApp}>{item.application}</Text>
          <Text style={[sectionStyles.colStatus, { color: statusColor(item.status) }]}>
            {formatComplianceStatusForPdf(item.status)}
          </Text>
        </View>
      ))}

      {userNotes ? (
        <View style={sectionStyles.notesBox}>
          <Text style={sectionStyles.notesTitle}>Compléments de l’entreprise :</Text>
          <Text style={sectionStyles.notesText}>{userNotes}</Text>
        </View>
      ) : null}
    </View>
  )
}
