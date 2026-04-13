# V3 simplifié & parcours court minimal — base produit (hors implémentation lourde)

**Statut :** structuration produit alignée sur le graphe stabilisé (`questionnaire-v3-graph.ts`), le moteur (`qualification-v3-decision.ts`, non modifié) et `docs/questionnaire-v3-parcours.md`.

**Principe directeur :** le **parcours long** reste la source de vérité détaillée ; le **parcours court** ne doit pas devenir un audit de conformité complet — priorité à la **réduction cognitive** (regroupement UX, progressive disclosure) tout en **conservant les mêmes pivots** tant que le moteur n’est pas rediscuté.

---

## 1. Synthèse audit (rappel)

| Zone | Difficulté perçue | Action produit typique |
|------|-------------------|-------------------------|
| E4.N7.Q3 / Q3.1 / Q2.1 | Libellés longs, cases multiples, charge juridique | Matrices + aide contextuelle ; **pas de fusion** des codes moteur |
| E4.N7.Q2 | Liste Annexe III longue | Vue « sensible / non » + détail repliable ; garder toutes les cases |
| E4.N7.Q4 | Produit + jargon Annexe I | Garder ; poser **uniquement** si `system_type = Produit` |
| E4.N7.Q5 | Art. 6.3 peu intuitif | Garder si Q2 sensible ; micro-explication + lien doc |
| E4.N8.Q9.1 | Phrase dense (émotions / biométrie / cadre autorisé) | Simplifier **rédactionnel** ; garder le pivot |
| E4.N8.Q11.\* | Enchaînement texte/média difficile à anticiper | **Wizard** ou matrice « contenus » ; logique graphe inchangée |
| E4.N8.Q10 | Compréhension « pourquoi parfois absent » | Texte d’étape + renvoi § doc Q10 |
| E5 (chaîne) | Mélange maturité / preuve / slots rapport | **Sortir progressivement** vers todo/dossier (déclaratif d’abord) |
| E6 | Court mais après long parcours | Garder en fin ; conditionnel déjà robuste |

**Points forts à préserver :** sorties ORS interdit, bande BPGV V3, règle Q10, E6 conditionnel, `active_question_codes`, alignement rapport/score.

**Branches intouchables (moteur / risque) :** Q3, Q3.1, Q2.1, Q2 (+ Q5 si sensible), Q4 (+ JNS), N8 Q9, Q9.1, Q11.0, Q11.1, T1, T1E, T2, M1, M2 (toute suppression ou fusion « réelle » = refonte moteur).

---

## 2. Proposition cible — parcours long simplifié (UX)

**Ordre logique (identique au graphe ; regroupement d’écran seulement) :**

1. **Carte d’identité du cas** — Q1, Q1.1 / Q1.2  
2. **Ligne rouge réglementaire** — Q3 → Q3.1 → Q2.1 (sortie ORS si interdit)  
3. **Rayon Annexes** — Q2 → (Q4 si produit) → Q5 si domaine sensible  
4. **Usage & contenus** — Q9 → Q9.1 → Q11.0 → Q11.1 → branches T\*/M\* → Q10 si applicable  
5. **Maturité / gouvernance (BPGV)** — E5.\* selon bande (courte ou longue)  
6. **Transparence ciblée** — Q12 → E6 (Q1/Q2 selon règles actuelles)

**À sortir du « flux principal » perçu (pas du JSON ni du moteur en premier lot) :** détails de preuve E5 (documents) → **dossier / todo** avec liens depuis les réponses déclaratives.

---

## 3. Proposition cible — parcours court minimal

**Hypothèse retenue (sans toucher au moteur) :** le parcours court = **même ensemble de pivots** que la qualification, présentés en **assistant court** (2–4 écrans matriciels), pas une nouvelle formule de risque.

**Pivots à conserver (codes) :**  
`E4.N7.Q1` (+ Q1.1 ou Q1.2) → `E4.N7.Q3` → `E4.N7.Q3.1` → `E4.N7.Q2.1` → [`E4.N7.Q4` si produit] → `E4.N7.Q2` → [`E4.N7.Q5` si sensible] → `E4.N8.Q9` → `E4.N8.Q9.1` → `E4.N8.Q11.0` → … (suite N8 selon réponses).

**Exclu du « court » perçu utilisateur (report après qualification) :** chaîne E5 complète et E6 — **à traiter en todo / dossier** avec message : « Affinez la maturité et les preuves » ; le **rapport court** = niveau AI Act + synthèse des pivots + renvoi obligatoire au long pour BPGV détaillé.

**Si produit exige un parcours encore plus court métier :** arbitrage juridique préalable — sinon risque de **palier faux** ou **impossible** non détecté (Q4 JNS, T1E JNS).

---

## 4. Règles transverses

| Sujet | Règle |
|-------|--------|
| Je ne sais pas | Conserver impossibilité qualification (Q4.C, Q5.C, T1E.C) — pas de contournement UX |
| Déclaratif / preuve | Questionnaire = déclaratif structuré ; preuves = dossier / pièces ; todo = actions |
| Questionnaire / todo / dossier | Après palier : todo alimentée par slots ; dossier pour artefacts |
| Qualification vs score | Niveau AI Act = moteur V3 ; score = maturité / principes — ne pas les fusionner dans l’UI court |

---

## 5. Tableau consolidé (questions du chemin V3 actif)

| Code | Texte actuel (abrégé si long) | Rôle | Statut recommandé |
|------|------------------------------|------|-------------------|
| E4.N7.Q1 | Dans cette situation, votre cas d'usage concerne | Rôle chaîne de valeur | **Garder** — long & court |
| E4.N7.Q1.1 / Q1.2 | Quelle phrase décrit le mieux votre situation ? | Affinage rôle | **Garder** — fusion UX possible (un seul écran à deux colonnes) |
| E4.N7.Q3 | Finalité une ou des activités suivantes (Art. 5) | Interdiction | **Garder** — intouchable |
| E4.N7.Q3.1 | Possible intervention dans l'une de ces situations ? | Interdiction | **Garder** — intouchable |
| E4.N7.Q2.1 | Utilisé dans un ou plusieurs des cas suivants ? | Interdiction / sensible | **Garder** — intouchable |
| E4.N7.Q4 | IA dans produit réglementé UE (Annexe I) | Haut risque produit | **Garder** (si Produit) — **Sortir du flux** si non-produit (déjà graphe) |
| E4.N7.Q2 | Domaines Annexe III | Haut risque domaine | **Modifier** (présentation matrice / replis) — **Garder** codes |
| E4.N7.Q5 | Tâche préparatoire sans influence décision (art. 6.3) | Garde-fou si sensible | **Garder** — **Simplifier** libellé + aide |
| E4.N8.Q9 | Interagit directement avec personnes physiques ? | Risque limité interaction | **Garder** |
| E4.N8.Q9.1 | Émotions / biométrie complémentaire cadre autorisé | Risque limité | **Garder** — **Simplifier** libellé |
| E4.N8.Q11.0 | Produit ou modifie contenus numériques par IA ? | Pivot contenu | **Garder** |
| E4.N8.Q11.1 | Quels types de contenu concernés ? | Texte / média | **Fusionner UX** avec Q11.0 (une grille « rien / texte / média / les deux ») |
| E4.N8.Q11.T1 | Texte intérêt public | Limited texte | **Garder** |
| E4.N8.Q11.T1E | (Historique) Relecture / validation — **hors parcours V3** | — | **Orphelin graphe** ; données anciennes possibles |
| E4.N8.Q11.T2 | (Historique) Précision usage texte — **hors parcours V3** | — | **Orphelin graphe** |
| E4.N8.Q11.M1 | Synthétique / manipulé pris pour authentique (deepfake) | Limited média | **Garder** |
| E4.N8.Q11.M2 | Exception artistique / fiction | Contexte deepfake | **Garder** |
| E4.N8.Q10 | Volumétrie personnes / mois | Contexte / bande | **Sortir du flow** perçu (optionnel post-palier) ou **Garder** avec label « indicatif » — **Rediscuter** produit |
| E5.N9.Q7 | Registre centralisé systèmes IA | Maturité / slot | **Garder** — **Todo** pour preuve |
| E5.N9.Q1–Q6, Q8, Q9 | Gestion risques, doc, prompts, données, cybersécurité, surveillance | Maturité | **Garder** en long — **Sortir du flow** court (todo) |
| E4.N8.Q12 | Formations IA Act | ORS / closure | **Garder** |
| E6.N10.Q1 | Informées qu’elles interagissent avec une IA ? | Transparence interaction | **Garder** (conditionnel) |
| E6.N10.Q2 | Contenu signalé (transparence) | Transparence contenu | **Garder** (conditionnel) |

*Questions E4.N8.Q2–Q8 présentes dans le JSON mais **hors graphe V3** : **Rediscuter** (suppression data vs usage futur).*

---

## 6. Implémentation ultérieure — ordre & risques

1. **Copie / micro-textes** (Q9.1, Q5, Q10) — faible risque.  
2. **Regroupement UI N8** (Q11.0 + Q11.1 matrice) — risque moyen (tests navigation + `active_question_codes`).  
3. **Mode « assistant court »** (même graphe, moins d’étapes visuelles) — risque moyen.  
4. **Déport E5 vers todo** — risque produit (utilisateur ne complète pas ; score incomplet) — **arbitrer** avec métier.  
5. **Vrai parcours court avec moins de questions** — **haut risque juridique** ; nécessite évolution **moteur** (hors scope actuel).

---

*Document produit — à synchroniser avec toute évolution du graphe dans `questionnaire-v3-graph.ts`.*
