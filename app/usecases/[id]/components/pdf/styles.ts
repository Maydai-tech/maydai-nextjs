import { StyleSheet } from '@react-pdf/renderer'

// Palette de couleurs
export const colors = {
  primary: '#0080A3',
  primaryDark: '#006280',
  secondary: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  orange: '#F97316',
  error: '#EF4444',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  white: '#FFFFFF',
  black: '#000000'
}

// Typographie - Police Helvetica (police système fiable)
export const fonts = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique'
}

// Styles de base
export const styles = StyleSheet.create({
  // Layout général
  page: {
    flexDirection: 'column',
    backgroundColor: colors.white,
    padding: 30,
    fontSize: 10,
    lineHeight: 1.4,
    fontFamily: fonts.regular
  },
  
  // Titres
  title: {
    fontSize: 24,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[900],
    marginBottom: 20
  },
  
  subtitle: {
    fontSize: 18,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[800],
    marginBottom: 15
  },
  
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[800],
    marginBottom: 12
  },
  
  subsectionTitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[700],
    marginBottom: 8
  },
  
  // Texte
  text: {
    fontSize: 10,
    color: colors.gray[700],
    marginBottom: 8
  },
  
  textSmall: {
    fontSize: 9,
    color: colors.gray[600],
    marginBottom: 6
  },
  
  textLarge: {
    fontSize: 12,
    color: colors.gray[800],
    marginBottom: 10
  },
  
  bold: {
    fontFamily: fonts.regular,
    fontWeight: 700
  },
  
  italic: {
    fontFamily: fonts.regular,
    fontWeight: 400,
    fontStyle: 'italic'
  },
  
  // Couleurs de texte
  textPrimary: {
    color: colors.primary
  },
  
  textSuccess: {
    color: colors.success
  },
  
  textWarning: {
    color: colors.warning
  },
  
  textError: {
    color: colors.error
  },
  
  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  
  column: {
    flexDirection: 'column'
  },
  
  spaceBetween: {
    justifyContent: 'space-between'
  },
  
  center: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  // Espacement
  marginBottom: {
    marginBottom: 10
  },
  
  marginBottomLarge: {
    marginBottom: 20
  },
  
  marginTop: {
    marginTop: 10
  },
  
  marginTopLarge: {
    marginTop: 20
  },
  
  // Cartes et conteneurs
  card: {
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  
  cardWhite: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15
  },
  
  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: fonts.regular,
    fontWeight: 700,
    textAlign: 'center'
  },
  
  badgeSuccess: {
    backgroundColor: colors.success,
    color: colors.white
  },
  
  badgeWarning: {
    backgroundColor: colors.warning,
    color: colors.white
  },
  
  badgeError: {
    backgroundColor: colors.error,
    color: colors.white
  },
  
  badgePrimary: {
    backgroundColor: colors.primary,
    color: colors.white
  },
  
  badgeGray: {
    backgroundColor: colors.gray[200],
    color: colors.gray[700]
  },
  
  // Barres de progression
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  
  // Listes
  list: {
    marginLeft: 15,
    marginBottom: 6
  },
  
  listItem: {
    fontSize: 8,
    color: colors.gray[700],
    marginBottom: 2,
    lineHeight: 1.2
  },
  
  // Tableaux
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 15
  },
  
  tableHeader: {
    backgroundColor: colors.gray[100],
    fontFamily: fonts.regular,
    fontWeight: 700,
    fontSize: 9,
    color: colors.gray[800],
    padding: 8,
    border: `1px solid ${colors.gray[300]}`
  },
  
  tableCell: {
    fontSize: 9,
    color: colors.gray[700],
    padding: 8,
    border: `1px solid ${colors.gray[300]}`
  },
  
  // Timeline
  timeline: {
    position: 'relative',
    paddingLeft: 20
  },
  
  timelineLine: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.primary
  },
  
  timelineItem: {
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 20
  },
  
  timelineDot: {
    position: 'absolute',
    left: -6,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    border: `2px solid ${colors.primary}`
  },
  
  // Icônes (utiliser des caractères Unicode)
  icon: {
    fontSize: 12,
    marginRight: 6
  },
  
  // Spécifique au PDF
  pageBreak: {
    pageBreakBefore: 'always'
  },
  
  // Header et footer
  header: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    height: 50
  },
  
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    height: 30,
    textAlign: 'center',
    fontSize: 8,
    color: colors.gray[500]
  },
  
  // Table des matières
  toc: {
    marginTop: 30
  },
  
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10
  },
  
  tocTitle: {
    fontFamily: fonts.regular,
    color: colors.gray[700]
  },
  
  tocPage: {
    fontFamily: fonts.regular,
    color: colors.gray[500]
  },
  
  // Scores
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  
  scoreCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    backgroundColor: colors.gray[50],
    border: `1px solid ${colors.gray[200]}`,
    borderRadius: 8,
    textAlign: 'center'
  },
  
  scoreValue: {
    fontSize: 24,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 5
  },
  
  scoreLabel: {
    fontSize: 9,
    color: colors.gray[600],
    fontFamily: fonts.regular,
    fontWeight: 700
  },
  
  // Scores par principes
  principleScore: {
    marginBottom: 12
  },
  
  principleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  
  principleName: {
    fontSize: 10,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[800]
  },
  
  principleValue: {
    fontSize: 10,
    fontFamily: fonts.regular,
    fontWeight: 700,
    color: colors.gray[700]
  }
})

// Fonctions utilitaires pour les couleurs de score
// Score ≥ 75 : Vert foncé #0080a3 — Bon
// Score ≥ 50 : Vert clair #c6eef8 — Moyen
// Score ≥ 30 : Orange (orange) — Faible
// Score < 30 : Rouge (red) — Critique
export const getScoreColor = (score: number) => {
  if (score >= 75) return '#0080a3' // Vert foncé
  if (score >= 50) return '#c6eef8' // Vert clair
  if (score >= 30) return '#f97316' // Orange
  return '#ef4444' // Rouge
}

export const getScoreStyle = (score: number) => {
  const color = getScoreColor(score)
  return {
    color,
    backgroundColor: color + '20' // 20% opacity
  }
}

// Styles pour les différents niveaux de risque
export const riskLevelStyles = {
  unacceptable: {
    color: colors.error,
    backgroundColor: colors.error + '20',
    label: 'Inacceptable'
  },
  high: {
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    label: 'Élevé'
  },
  limited: {
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    label: 'Limité'
  },
  minimal: {
    color: colors.success,
    backgroundColor: colors.success + '20',
    label: 'Minimal'
  }
}
