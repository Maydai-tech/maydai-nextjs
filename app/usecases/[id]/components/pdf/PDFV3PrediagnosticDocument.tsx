import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { V3PrediagnosticPdfModel } from '../../utils/v3-prediagnostic-pdf-model'
import { colors, fonts } from './styles'

const s = {
  page: {
    padding: 26,
    fontFamily: fonts.regular,
    fontSize: 8,
    lineHeight: 1.35,
    color: colors.gray[800],
  },
  brand: { fontSize: 9, color: colors.primary, fontFamily: fonts.bold, marginBottom: 4 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.gray[900], marginBottom: 6 },
  subtitle: { fontSize: 9, color: colors.gray[600], marginBottom: 10 },
  section: { fontSize: 9, fontFamily: fonts.bold, color: colors.primaryDark, marginTop: 8, marginBottom: 4 },
  body: { fontSize: 8, color: colors.gray[700], marginBottom: 3 },
  bullet: { fontSize: 8, color: colors.gray[700], marginBottom: 2, paddingLeft: 6 },
  box: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  disclaimer: { fontSize: 7, color: colors.gray[600], fontStyle: 'italic', marginTop: 10 },
  linkLine: { fontSize: 8, color: colors.primary, marginBottom: 2 },
}

function formatGeneratedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export function PDFV3PrediagnosticDocument({ model }: { model: V3PrediagnosticPdfModel }) {
  const docTitle = `Pré-diagnostic court — ${model.useCaseName}`

  return (
    <Document title={docTitle} author="MaydAI" subject="Pré-diagnostic AI Act (parcours court)" producer="MaydAI">
      <Page size="A4" style={s.page} wrap>
        <Text style={s.brand}>MaydAI</Text>
        <Text style={s.title}>Pré-diagnostic AI Act (parcours court)</Text>
        <Text style={s.subtitle}>
          {model.companyName ? `${model.companyName} · ` : ''}
          {model.useCaseName}
          {' · '}
          {formatGeneratedDate(model.generatedAtIso)}
        </Text>

        <View style={s.box}>
          <Text style={{ ...s.body, fontFamily: fonts.bold, color: colors.gray[900] }}>{model.filRougeTitle}</Text>
          <Text style={s.body}>{model.filRougeBody}</Text>
        </View>

        <Text style={s.section}>Qualification (moteur AI Act — périmètre court)</Text>
        <Text style={s.body}>
          <Text style={{ fontFamily: fonts.bold }}>Statut : </Text>
          {model.qualificationLine}
        </Text>
        <Text style={s.body}>
          <Text style={{ fontFamily: fonts.bold }}>Niveau indiqué : </Text>
          {model.riskLine}
        </Text>
        <Text style={{ ...s.body, fontSize: 7, color: colors.gray[600] }}>
          Indication issue des réponses enregistrées sur le parcours court. Ce n’est ni un score de maturité ni une
          preuve documentaire dans le dossier du cas.
        </Text>

        <Text style={s.section}>Ce que cela implique (rappel)</Text>
        {model.implications.map((line) => (
          <Text key={line} style={s.bullet}>
            · {line}
          </Text>
        ))}

        <Text style={s.section}>Ce pré-diagnostic a permis d’établir</Text>
        {model.establishedCore.map((line) => (
          <Text key={line} style={s.bullet}>
            · {line}
          </Text>
        ))}
        {model.transparencySignals.length > 0 ? (
          model.transparencySignals.map((sig) => (
            <Text key={sig.title} style={s.bullet}>
              · {sig.title} — {sig.detail}
            </Text>
          ))
        ) : (
          <Text style={s.bullet}>
            · Pas d’étape sensibilisation (Q12) ni transparence E6 sur cette branche du graphe.
          </Text>
        )}

        <Text style={s.section}>Ce qu’il reste à compléter (hors parcours court)</Text>
        {model.remainingItems.map((item) => (
          <Text key={item.title} style={s.bullet}>
            · <Text style={{ fontFamily: fonts.bold }}>{item.title}</Text> — {item.detail}
          </Text>
        ))}

        <Text style={s.section}>Pourquoi enchaîner avec le parcours complet</Text>
        {model.whyLong.map((line) => (
          <Text key={line} style={s.bullet}>
            · {line}
          </Text>
        ))}

        <Text style={s.section}>Liens utiles (déclarer → documenter → agir)</Text>
        {model.links.length > 0 ? (
          model.links.map((l) => (
            <Text key={l.href} style={s.linkLine}>
              · {l.label} : {l.href}
            </Text>
          ))
        ) : (
          <Text style={s.body}>Connectez-vous à MaydAI pour accéder au parcours complet, au dossier du cas et à la todo conformité.</Text>
        )}

        <Text style={{ ...s.body, marginTop: 8, fontSize: 7 }}>{model.notRapportCompletNote}</Text>

        <Text style={s.disclaimer}>{model.disclaimer}</Text>
      </Page>
    </Document>
  )
}
