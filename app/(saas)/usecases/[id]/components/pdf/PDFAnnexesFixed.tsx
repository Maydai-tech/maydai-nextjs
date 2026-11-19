import React from 'react'
import { Page, Text, View } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFAnnexesFixedProps {
  data: PDFReportData
}

export const PDFAnnexesFixed: React.FC<PDFAnnexesFixedProps> = ({ data }) => {
  return (
    <>
      {/* Page 9: Impact Environnemental */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 15, fontSize: 16 }]}>
          8. Impact Environnemental
        </Text>
        
        <View style={[styles.card, { marginBottom: 15 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Les critères suivants sont intégrés aux demandes de transparence de l'AI Act mais ne sont pas encore transmises par les technologies concernées :
          </Text>

          {/* Nombre de GPUs */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Nombre de GPUs
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              Nombre total d'unités de traitement graphique (GPU) utilisées pour entraîner le modèle d'IA. Les GPUs sont des composants très puissants mais aussi très énergivores. Plus on en utilise, plus la consommation d'énergie globale augmente de manière significative. C'est un multiplicateur direct de la consommation électrique.
            </Text>
          </View>

          {/* Consommation électrique par GPU */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Consommation électrique par GPU
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              Puissance électrique moyenne consommée par un seul GPU pendant l'entraînement, généralement mesurée en Watts (W). Toutes les puces graphiques ne se valent pas. Un GPU de dernière génération très performant peut consommer beaucoup plus qu'un modèle plus ancien. Cette valeur permet d'affiner le calcul de la consommation totale.
            </Text>
          </View>

          {/* Temps d'entraînement */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Temps d'entraînement
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              Durée totale nécessaire pour entraîner le modèle, souvent exprimée en heures. Il s'agit du facteur "temps" car même avec peu de GPUs peu gourmands, un entraînement qui dure des semaines ou des mois aura un impact énergétique plus important.
            </Text>
          </View>

          {/* Intensité carbone du datacenter */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 8, fontSize: 12 }]}>
              Intensité carbone du datacenter
            </Text>
            <Text style={[styles.text, { lineHeight: 1.4, fontSize: 9 }]}>
              Mesure qui indique la quantité de dioxyde de carbone (CO2) émise pour produire une unité d'énergie (par exemple, en grammes de CO2 par kilowatt-heure, gCO2eq/kWh). Cette valeur dépend de la localisation géographique du datacenter et de son mix énergétique (nucléaire, charbon, solaire, éolien, etc.). C'est le critère clé pour passer de la consommation d'énergie à l'empreinte carbone. Entraîner un modèle dans un datacenter alimenté par des énergies renouvelables en Suède aura un impact carbone bien plus faible que de l'entraîner dans un datacenter qui dépend du charbon en Pologne, même si la consommation d'énergie est identique.
            </Text>
          </View>
        </View>

        <PDFFooter pageNumber={9} />
      </Page>

      {/* Page 10: Références Légales Clés */}
      <Page size="A4" style={styles.page}>
        <Text style={[styles.sectionTitle, { marginBottom: 20, fontSize: 16 }]}>
          9. Références Légales Clés
        </Text>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20, fontSize: 9 }]}>
            Règlement AI Act : règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 (l'AI Act).
          </Text>

          {/* Articles de l'AI Act */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15, fontSize: 12 }]}>
              Articles principaux
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 3 : Définitions</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 5 : Pratiques interdites</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 6 : Classification des systèmes d'IA</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 9 : Gestion des risques</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 10 : Qualité des données</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 11 : Documentation technique</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 12 : Enregistrement</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 13 : Transparence</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 14 : Supervision humaine</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 50 : Obligations de transparence</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 52 : Information des utilisateurs</Text>
            </View>
          </View>

          {/* Annexes importantes */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15, fontSize: 12 }]}>
              Annexes importantes
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Annexe I : Systèmes d'IA à haut risque</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Annexe III : Systèmes d'IA à haut risque</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Annexe IV : Documentation technique</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Annexe V : Procédures d'évaluation de la conformité</Text>
            </View>
          </View>

          {/* Sanctions */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15, fontSize: 12 }]}>
              Sanctions et contrôles
            </Text>
            <View style={styles.list}>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 99 : Sanctions administratives</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 100 : Sanctions pécuniaires</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 101 : Sanctions pécuniaires pour les PME</Text>
              <Text style={[styles.listItem, { fontSize: 9 }]}>• Article 102 : Sanctions pécuniaires pour les entreprises</Text>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={10} />
      </Page>
    </>
  )
}
