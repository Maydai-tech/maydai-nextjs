import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import type { ReportCanonicalItem } from '@/lib/report-canonical-items'
import {
  declarationStatusPdfLabel,
  evidenceStatusPdfLabel,
  LEGAL_TAXONOMY_SHORT,
} from '@/lib/report-canonical-items'
import { groupStandardPlanItemsByLegalCode } from '@/lib/report-plan-ors-ocru-bpgv'
import { PDFReportData } from './types'
import { styles } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFRecommandationsFixedProps {
  data: PDFReportData
}

function absUrl(base: string | undefined, path: string): string {
  const b = (base || '').replace(/\/$/, '')
  return b ? `${b}${path}` : path
}

function PDFCanonicalItemBlock({
  item,
  baseUrl,
}: {
  item: ReportCanonicalItem
  baseUrl?: string
}) {
  const todoLink = absUrl(baseUrl, item.cta.todoUrl)
  const dossierLink = absUrl(baseUrl, item.cta.dossierUrl)
  const ctaLine = item.cta.completed
    ? `Statut action : complétée dans le dossier — ouvrir : ${dossierLink}`
    : `Action à mener : ${item.cta.label} — To-do : ${todoLink} — Dossier : ${dossierLink}`

  return (
    <View style={{ marginBottom: 10 }} wrap>
      <Text style={[styles.text, { fontSize: 8, fontWeight: 'bold', marginBottom: 3 }]}>
        [{LEGAL_TAXONOMY_SHORT[item.legal.code]}] {declarationStatusPdfLabel(item.declaration.status)} —{' '}
        {evidenceStatusPdfLabel(item.evidence.status)}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 2 }]}>
        Mesure (catalogue) : {item.identity.action_label}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 2 }]}>
        Fondement : {item.legal.basis_primary}
      </Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, marginBottom: 3, fontStyle: 'italic' }]}>
        Gouvernance : {item.governance.rationale}
      </Text>
      <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.35, marginBottom: 3 }]}>• {item.narrative.text}</Text>
      <Text style={[styles.text, { fontSize: 8, lineHeight: 1.35, color: '#006280' }]}>{ctaLine}</Text>
      {item.cta.points > 0 && (
        <Text style={[styles.text, { fontSize: 8, marginTop: 2 }]}>
          Points associés (indicatif) : +{item.cta.points} pts
        </Text>
      )}
    </View>
  )
}

function PDFCanonicalPlanGroup({
  title,
  subtitle,
  items,
  baseUrl,
}: {
  title: string
  subtitle: string
  items: ReportCanonicalItem[]
  baseUrl?: string
}) {
  if (items.length === 0) return null
  return (
    <View style={[styles.cardWhite, { marginBottom: 15 }]}>
      <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>{title}</Text>
      <Text style={[styles.text, styles.italic, { marginBottom: 10, fontSize: 9 }]}>{subtitle}</Text>
      <View style={styles.list}>
        {items.map(item => (
          <PDFCanonicalItemBlock key={item.identity.report_slot_key} item={item} baseUrl={baseUrl} />
        ))}
      </View>
    </View>
  )
}

export const PDFRecommandationsFixed: React.FC<PDFRecommandationsFixedProps> = ({ data }) => {
  const risk = (data.riskLevel?.risk_level || '').toLowerCase()
  const isUnacceptable = risk === 'unacceptable'
  const items = data.canonicalPlanItems ?? []
  const baseUrl = data.pdfCtaBaseUrl
  const groups = groupStandardPlanItemsByLegalCode(items)
  const [g0, g1, g2] = groups

  return (
    <>
      {/* Page 7: Évaluation de la Conformité - Partie 1 */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          6. Évaluation de la Conformité et Actions Recommandées
        </Text>

        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section évalue la conformité du système d'IA aux exigences de l'AI Act, structurée autour des six
            principes éthiques et techniques clés. Pour chaque point, des quick wins (actions rapides) et des actions à
            mener sont proposées.
          </Text>

          {/* Introduction */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>Introduction</Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              {data.nextSteps?.introduction ||
                `${data.useCase.companies?.name || "L'entreprise"} a prévu de déployer le ${
                  data.useCase.deployment_date
                    ? new Date(data.useCase.deployment_date).toLocaleDateString('fr-FR')
                    : 'prochainement'
                } ${data.useCase.name}, un produit basé sur l'IA classé dans les ${
                  data.useCase.ai_category || "systèmes d'IA"
                }. Ce cas d'usage, géré par le service ${
                  data.useCase.responsible_service || 'le service concerné'
                }, utilise différents modèles dont ${
                  data.useCase.compl_ai_models?.model_name || "un modèle d'IA"
                } de ${
                  data.useCase.compl_ai_models?.model_provider || 'un fournisseur'
                } pour ${data.useCase.description || 'automatiser diverses tâches'}. Le déploiement concernera ${
                  data.useCase.deployment_countries?.join(', ') || 'la France'
                }, pays membre de l'Union européenne, ce qui soumet ce cas d'usage à l'AI Act. L'évaluation de conformité indique un niveau de risque ${
                  data.riskLevel?.risk_level || 'limited'
                }, impliquant des obligations spécifiques en matière de transparence et de gestion des risques.`}
            </Text>
          </View>

          {/* Évaluation du niveau de risque */}
          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Évaluation du niveau de risque AI Act
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              {data.nextSteps?.evaluation ||
                `Le niveau de risque de ${data.useCase.name} est classé comme ${
                  data.riskLevel?.risk_level || 'limited'
                }. Cette évaluation repose sur l'analyse des réponses au questionnaire et des caractéristiques spécifiques du système d'IA. Les obligations réglementaires applicables dépendent de ce niveau de risque et des articles pertinents de l'AI Act.`}
            </Text>
          </View>

          {isUnacceptable ? (
            <View style={[styles.cardWhite]}>
              <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
                Cas classé « interdit » (AI Act)
              </Text>
              <Text style={[styles.text, { fontSize: 9, lineHeight: 1.35, marginBottom: 8 }]}>
                Le plan d’action standard à neuf mesures ne s’applique pas. Retrouvez le détail et les actions spécifiques
                dans le rapport en ligne MaydAI.
              </Text>
              {data.nextSteps?.interdit_1 ? (
                <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.35, marginBottom: 4 }]}>
                  • {data.nextSteps.interdit_1}
                </Text>
              ) : null}
              {data.nextSteps?.interdit_2 ? (
                <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.35, marginBottom: 4 }]}>
                  • {data.nextSteps.interdit_2}
                </Text>
              ) : null}
              {data.nextSteps?.interdit_3 ? (
                <Text style={[styles.listItem, { fontSize: 9, lineHeight: 1.35 }]}>• {data.nextSteps.interdit_3}</Text>
              ) : null}
            </View>
          ) : (
            g0 ? (
              <PDFCanonicalPlanGroup title={g0.title} subtitle={g0.subtitle} items={g0.items} baseUrl={baseUrl} />
            ) : null
          )}
        </View>

        <PDFFooter pageNumber={7} />
      </Page>

      {/* Page 8: suite plan canonique ou recommandations génériques si vide */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          6. Évaluation de la Conformité et Actions Recommandées (suite)
        </Text>

        <View style={[styles.card, { marginBottom: 20 }]}>
          {!isUnacceptable && groups.length > 0 ? (
            <>
              {g1 ? (
                <PDFCanonicalPlanGroup title={g1.title} subtitle={g1.subtitle} items={g1.items} baseUrl={baseUrl} />
              ) : null}
              {g2 ? (
                <PDFCanonicalPlanGroup title={g2.title} subtitle={g2.subtitle} items={g2.items} baseUrl={baseUrl} />
              ) : null}
            </>
          ) : !isUnacceptable ? (
            <View style={[styles.cardWhite]}>
              <Text style={[styles.text, { fontSize: 9, lineHeight: 1.35 }]}>
                Données de plan d’action indisponibles pour générer le détail canonique. Consultez le rapport web.
              </Text>
            </View>
          ) : (
            <View style={[styles.cardWhite]}>
              <Text style={[styles.text, { fontSize: 9, lineHeight: 1.35 }]}>
                (Suite réservée au rapport en ligne pour les cas interdits.)
              </Text>
            </View>
          )}
        </View>

        <PDFFooter pageNumber={8} />
      </Page>

      {/* Page 9: Recommandations Générales */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>7. Recommandations Générales</Text>

        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Cette section présente des recommandations générales pour améliorer la conformité et la gouvernance de votre
            système d'IA.
          </Text>

          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>Intégration « par design »</Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Intégrer les principes de l'AI Act dès la conception des produits et services IA pour assurer la pérennité
              et la compétitivité.
            </Text>
          </View>

          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>Évaluation Continue</Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              L'IA est une technologie en évolution rapide. Il est crucial de procéder à des évaluations régulières et
              d'adapter les systèmes et les processus de conformité en continu.
            </Text>
          </View>

          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>Formation</Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Sensibiliser et former toutes les équipes (développement, juridique, conformité, gestion) aux exigences de
              l'AI Act et aux meilleures pratiques en matière d'IA éthique et transparente.
            </Text>
          </View>

          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>Outils de Conformité</Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Utiliser des boîtes à outils dédiées (telles que celles de MaydAI ou le cadre COMPL-AI) pour faciliter
              l'identification des systèmes, la classification des risques, la cartographie des obligations
              réglementaires et la gestion des risques.
            </Text>
          </View>

          <View style={[styles.cardWhite, { marginBottom: 15 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>
              Bac à Sable Réglementaire
            </Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Envisager la participation à des « bacs à sable réglementaires » (regulatory sandboxes) pour développer et
              tester des systèmes d'IA innovants sous supervision réglementaire, ce qui peut renforcer la sécurité
              juridique et accélérer l'accès au marché pour les PME.
            </Text>
          </View>

          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 11 }]}>Collaboration</Text>
            <Text style={[styles.text, { fontSize: 9, lineHeight: 1.3 }]}>
              Participer aux efforts de standardisation et de développement de codes de bonne pratique, encouragés par le
              Bureau de l'IA.
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={9} />
      </Page>
    </>
  )
}
