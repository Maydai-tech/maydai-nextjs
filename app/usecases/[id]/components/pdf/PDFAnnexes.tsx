import React from 'react'
import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PDFReportData } from './types'
import { styles, colors } from './styles'
import { PDFFooter } from './PDFFooter'

interface PDFAnnexesProps {
  data: PDFReportData
}

export const PDFAnnexes: React.FC<PDFAnnexesProps> = ({ data }) => {
  return (
    <>
      {/* Page 10: Impact Environnemental */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, { marginBottom: 15 }]}>
          <Text style={[styles.icon, { fontSize: 12, color: colors.primary }]}>•</Text>
          <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16 }]}>
            8. Impact Environnemental
          </Text>
        </View>
        
        <View style={[styles.card, { marginBottom: 15 }]}>
          <Text style={[styles.text, { lineHeight: 1.4, marginBottom: 15, fontSize: 9 }]}>
            Les critères suivants sont intégrés aux demandes de transparence de l'AI Act mais ne sont pas encore transmises par les technologies concernées :
          </Text>

          {/* Nombre de GPUs */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Nombre de GPUs
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Nombre total d'unités de traitement graphique (GPU) utilisées pour entraîner le modèle d'IA. Les GPUs sont des composants très puissants mais aussi très énergivores. Plus on en utilise, plus la consommation d'énergie globale augmente de manière significative. C'est un multiplicateur direct de la consommation électrique.
            </Text>
          </View>

          {/* Consommation électrique par GPU */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Consommation électrique par GPU
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Puissance électrique moyenne consommée par un seul GPU pendant l'entraînement, généralement mesurée en Watts (W). Toutes les puces graphiques ne se valent pas. Un GPU de dernière génération très performant peut consommer beaucoup plus qu'un modèle plus ancien. Cette valeur permet d'affiner le calcul de la consommation totale.
            </Text>
          </View>

          {/* Temps d'entraînement */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Temps d'entraînement
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Durée totale nécessaire pour entraîner le modèle, souvent exprimée en heures. Il s'agit du facteur "temps" car même avec peu de GPUs peu gourmands, un entraînement qui dure des semaines ou des mois aura un impact énergétique plus important.
            </Text>
          </View>

          {/* Intensité carbone du datacenter */}
          <View style={[styles.cardWhite]}>
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Text style={[styles.icon, { fontSize: 10, color: colors.primary }]}>•</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 0 }]}>
                Intensité carbone du datacenter
              </Text>
            </View>
            <Text style={[styles.text, { lineHeight: 1.4 }]}>
              Mesure qui indique la quantité de dioxyde de carbone (CO2) émise pour produire une unité d'énergie (par exemple, en grammes de CO2 par kilowatt-heure, gCO2eq/kWh). Cette valeur dépend de la localisation géographique du datacenter et de son mix énergétique (nucléaire, charbon, solaire, éolien, etc.). C'est le critère clé pour passer de la consommation d'énergie à l'empreinte carbone. Entraîner un modèle dans un datacenter alimenté par des énergies renouvelables en Suède aura un impact carbone bien plus faible que de l'entraîner dans un datacenter qui dépend du charbon en Pologne, même si la consommation d'énergie est identique.
            </Text>
          </View>
        </View>
      </Page>

      {/* Pages 11-12: Références Légales Clés */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, { marginBottom: 20 }]}>
          <Text style={[styles.icon, { fontSize: 12, color: colors.primary }]}>•</Text>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            9. Références Légales Clés
          </Text>
        </View>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Règlement AI Act : règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 (l'AI Act).
          </Text>

          {/* Articles de l'AI Act */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Articles principaux
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 5</Text> — Pratiques d'IA interdites.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Chapitre III, Section 2</Text> — Exigences applicables aux systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 9</Text> — Système de gestion des risques.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 10</Text> — Gouvernance des données.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 11</Text> — Documentation technique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 12</Text> — Enregistrement (journaux).</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 13</Text> — Transparence et fourniture d'informations aux déployeurs.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 14</Text> — Contrôle humain.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 15</Text> — Exactitude, robustesse et cybersécurité.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 17</Text> — Système de gestion de la qualité.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 26</Text> — Obligations incombant aux déployeurs de systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 27</Text> — Analyse d'impact des systèmes d'IA à haut risque sur les droits fondamentaux.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 49</Text> — Enregistrement dans la base de données de l'UE.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 50</Text> — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 51</Text> — Classification de modèles d'IA à usage général en tant que modèles d'IA à usage général présentant un risque systémique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 53</Text> — Obligations des fournisseurs de modèles d'IA à usage général.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 55</Text> — Obligations des fournisseurs de modèles d'IA à usage général présentant un risque systémique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 56</Text> — Codes de bonne pratique pour les GPAI.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 57</Text> — Bacs à sable réglementaires de l'IA.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 60</Text> — Essais en conditions réelles.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 72</Text> — Surveillance après commercialisation.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 73</Text> — Signalement d'incidents graves.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 99</Text> — Sanctions administratives.</Text>
            </View>
          </View>

          {/* Annexes */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Annexes
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe III</Text> : Liste des systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe IV</Text> : Documentation technique pour les systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe XI</Text> : Documentation technique pour les fournisseurs de modèles d'IA à usage général.</Text>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={10} />
      </Page>

      {/* Pages 11-12: Références Légales Clés */}
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, { marginBottom: 20 }]}>
          <Text style={[styles.icon, { fontSize: 12, color: colors.primary }]}>•</Text>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            9. Références Légales Clés
          </Text>
        </View>
        
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.text, { lineHeight: 1.6, marginBottom: 20 }]}>
            Règlement AI Act : règlement (UE) 2024/1689 du Parlement européen et du Conseil du 13 juin 2024 (l'AI Act).
          </Text>

          {/* Articles de l'AI Act */}
          <View style={[styles.cardWhite, { marginBottom: 20 }]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Articles principaux
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 5</Text> — Pratiques d'IA interdites.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Chapitre III, Section 2</Text> — Exigences applicables aux systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 9</Text> — Système de gestion des risques.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 10</Text> — Gouvernance des données.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 11</Text> — Documentation technique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 12</Text> — Enregistrement (journaux).</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 13</Text> — Transparence et fourniture d'informations aux déployeurs.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 14</Text> — Contrôle humain.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 15</Text> — Exactitude, robustesse et cybersécurité.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 17</Text> — Système de gestion de la qualité.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 26</Text> — Obligations incombant aux déployeurs de systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 27</Text> — Analyse d'impact des systèmes d'IA à haut risque sur les droits fondamentaux.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 49</Text> — Enregistrement dans la base de données de l'UE.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 50</Text> — Obligations de transparence pour les fournisseurs et les déployeurs de certains systèmes d'IA.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 51</Text> — Classification de modèles d'IA à usage général en tant que modèles d'IA à usage général présentant un risque systémique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 53</Text> — Obligations des fournisseurs de modèles d'IA à usage général.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 55</Text> — Obligations des fournisseurs de modèles d'IA à usage général présentant un risque systémique.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 56</Text> — Codes de bonne pratique pour les GPAI.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 57</Text> — Bacs à sable réglementaires de l'IA.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 60</Text> — Essais en conditions réelles.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 72</Text> — Surveillance après commercialisation.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 73</Text> — Signalement d'incidents graves.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Article 99</Text> — Sanctions administratives.</Text>
            </View>
          </View>

          {/* Annexes */}
          <View style={[styles.cardWhite]}>
            <Text style={[styles.subsectionTitle, { marginBottom: 15 }]}>
              Annexes
            </Text>
            
            <View style={styles.list}>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe III</Text> : Liste des systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe IV</Text> : Documentation technique pour les systèmes d'IA à haut risque.</Text>
              <Text style={styles.listItem}><Text style={styles.bold}>Annexe XI</Text> : Documentation technique pour les fournisseurs de modèles d'IA à usage général.</Text>
            </View>
          </View>
        </View>

        <PDFFooter pageNumber={11} />
      </Page>
    </>
  )
}

