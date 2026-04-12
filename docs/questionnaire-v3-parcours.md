# Parcours questionnaire V3 — graphe, `active_question_codes`, recette

Référence unique pour aligner **spec**, **graphe** (`questionnaire-v3-graph.ts`), **UI** (façade `questionnaire.ts` → `getNextQuestionV3`), **`active_question_codes`** (`collectV3ActiveQuestionCodes`) et **moteur de qualification** (`qualification-v3-decision.ts` — hors périmètre de ce document, mais les pivots listés ici alimentent la décision).

## 1. Vue d’ensemble

### Ordre logique (hors sorties anticipées « interdit »)

1. **Bloc contexte / risque** : `E4.N7.Q1` → `Q1.1` ou `Q1.2` → `Q3` → `Q3.1` → (`Q2.1`) → [ **`Q4` si `system_type = Produit`** ] → `Q2` → [ **`Q5` si Annexe III sensible** ] → `N8`.
2. **Bloc N8 (usage, contenus)** : `Q9` → `Q9.1` → `Q11.0` → branche **texte / média / ni l’un ni l’autre** → éventuellement **`Q10` (volumétrie)** → **E5 (BPGV)** → `Q12` → éventuellement **E6**.
3. **E6** : transparence utilisateur / marquage contenu, **uniquement après `Q12`**, selon des conditions sur `Q9` et `Q11.0`.

### Produit vs non-produit

| `usecases.system_type` | Après `E4.N7.Q2.1` | Effet |
|------------------------|--------------------|--------|
| **`Produit`** (constante `V3_PRODUCT_SYSTEM_TYPE`) | `E4.N7.Q4` (Annexe I) | Puis `E4.N7.Q2` ; la qualification peut dépendre de Q4 (y compris JNS → impossible côté moteur). |
| **Autre ou vide** | `E4.N7.Q2` direct | Pas de Q4 dans le parcours ni dans `active_question_codes`. |

### Sorties ORS « courtes »

- **`E4.N7.Q3.1`** : si filtre ORS = interdit (même logique V2 `isOrsUnacceptableAtQ31`) → **`E5.N9.Q7`** (parcours raccourci, pas N8 complet).
- **`E4.N7.Q2.1`** : si réponses = interdiction `unacceptable` (dérivé comme dans le graphe) → **`E5.N9.Q7`**.

Ces chemins **court-circuitent** N8 / Q10 / E6 pour les cas déjà qualifiés interdits au niveau ORS.

---

## 2. `active_question_codes` — comment l’interpréter

- **Source de vérité navigation** : `collectV3ActiveQuestionCodes(answers, systemType)` dans `questionnaire-v3-graph.ts`.
- **Algorithme** : à partir de `E4.N7.Q1`, enchaîne `getNextQuestionV3` tant que la question courante a une **réponse** et qu’il existe un **suivant**.
- **Conséquence** : c’est le **préfixe du chemin effectivement parcouru** jusqu’à la **première question sans réponse** (question courante d’évaluation) ou fin de graphe. Ce n’est **pas** la liste de toutes les questions *possibles* dans une branche hypotétique.
- **Absence d’un code** : soit la branche ne passe pas par cette question, soit l’utilisateur n’y est pas encore arrivé — distinguer via l’état des réponses et ce document.

**Écart = bug** si : la même réponse en base mène à un écran différent de `getNextQuestionV3` (régression façade / version). **Pas un bug** si la recette attendait Q10 partout : voir § Q10.

---

## 3. Table des pivots (extraits)

| Code | Rôle dans le parcours | Suite typique |
|------|------------------------|---------------|
| `E4.N7.Q3` / `Q3.1` | Finalités / situations Art. 5 | `Q2.1` ou sortie `E5.N9.Q7` si ORS interdit |
| `E4.N7.Q2.1` | Cas Annexe III « sensibles » | `Q4` (produit) ou `Q2` ; ou sortie interdit |
| `E4.N7.Q4` | Annexe I (produit uniquement) | `Q2` |
| `E4.N7.Q2` | Domaines Annexe III | `Q5` si au m une case ≠ « Aucun », sinon `Q9` |
| `E4.N7.Q5` | Garde-fou art. 6.3 | `Q9` ; influence **bande BPGV** (Q2 peut être exclue du calcul si `Q5.A` + domaine sensible) |
| `E4.N8.Q9` | Interaction directe avec personnes physiques | `Q9.1` |
| `E4.N8.Q9.1` | Émotions / biométrie « complémentaire » | `Q11.0` |
| `E4.N8.Q11.0` | Système produit / modifie contenus numériques ? | `A` → `Q11.1` ; `B` → **`Q10`** |
| `E4.N8.Q11.1` | Types texte / image-audio-vidéo | `T1` si texte ; `M1` si média ; les deux si les deux ; **ni texte ni média** → **`Q10`** |
| `E4.N8.Q11.T1` | Texte & intérêt public | `T1E` si oui ; `T2` si non |
| `E4.N8.Q11.T1E` | Contrôle éditorial humain | Si média aussi coché → `M1` ; sinon **première question E5** (`E5.N9.Q7` si bande ORS encore **minimal**, sinon `E5.N9.Q1`) — **sans Q10** |
| `E4.N8.Q11.T2` | Précision si pas T1 « oui » | Idem : média → `M1`, sinon première E5 selon bande — **sans Q10** |
| `E4.N8.Q11.M1` | Deepfake / pris pour authentique | `A` → `M2` ; `B` → E5 (**sans Q10**) |
| `E4.N8.Q11.M2` | Exception artistique / fiction | **`Q10`** puis E5 |
| `E4.N8.Q10` | Volumétrie | Première question **E5** (`E5.N9.Q1` ou `E5.N9.Q7` selon bande ORS) |
| `E4.N8.Q12` | Après bloc E5 | Voir § E6 |
| `E6.N10.Q1` | Info « interaction avec IA » | `Q2` si `Q11.0=A`, sinon fin |
| `E6.N10.Q2` | Marquage contenu | Fin |

---

## 4. Q10 (E4.N8.Q10) — quand elle apparaît

**Comportement voulu** (graphe actuel) :

| Scénario | Q10 dans le chemin ? |
|----------|----------------------|
| `Q11.0 = Non` (pas de production / modification de contenus numériques par l’IA) | **Oui** (directement après `Q11.0`) |
| `Q11.0 = Oui`, `Q11.1` sans texte ni média coché | **Oui** |
| `Q11.0 = Oui`, branche **texte seule** jusqu’à `T1E` ou `T2`, **sans** volet média | **Non** — enchaînement direct vers **E5** (`Q7` ou `Q1` selon `getFirstE5AfterOrsV3`, ex. `Q1` si la bande ORS n’est plus minimale après `T1` / pivots N8) |
| `Q11.0 = Oui`, `M1 = Non` (pas de deepfake déclaré) | **Non** — E5 direct |
| `M1 = Oui` puis **`M2`** | **Oui** (Q10 après M2) |

**Message recette** : l’absence de Q10 sur un parcours « contenu numérique oui + texte sans média » ou « média sans deepfake » est **normale**, pas une régression. La Q10 sert ici de **point de volumétrie** sur les chemins qui y passent par design (dont « pas de contenus IA » et « deepfake oui → M2 »).

---

## 5. E6.N10.Q1 / Q2 — après Q12

Implémentation : `getNextAfterQ12` / `getNextE6` dans `questionnaire-v3-graph.ts`.

| Condition (sur réponses déjà données) | Après `E4.N8.Q12` |
|----------------------------------------|-------------------|
| `E4.N8.Q9 = Oui` (interaction directe) | **`E6.N10.Q1`** ; puis si `Q11.0 = Oui` → **`E6.N10.Q2`**, sinon fin |
| `E4.N8.Q9 = Non` et `Q11.0 = Oui` | **`E6.N10.Q2` seul** (pas Q1) |
| `Q9 = Non` et `Q11.0 = Non` | **Ni Q1 ni Q2** |

**Cohérence** : Q1 = transparence liée à l’**interaction** ; Q2 = marquage des **contenus** ; si pas d’interaction mais contenus IA, seul le volet marquage est posé.

---

## 6. Bande BPGV (longue vs courte)

- **Calcul** : `deriveBpgvBandFromOrsAnswersV3` agrège le **max** des « bandes » dérivées des options sur les questions **E4.N7.\*** et **E4.N8.\*** avec exclusions :
  - pas **Q10**, pas **Q12** ;
  - pas **E4.N8.Q2–Q8** (aligné V2 ORS) ;
  - si **E4.N7.Q5.A** et Annexe III sensible : **E4.N7.Q2** est **exclue** du calcul (évite un « high » uniquement domaine + 6.3 oui sans suite).
- **Première question E5** : `getFirstE5AfterOrsV3` — bande **minimal** → `E5.N9.Q7` ; sinon → `E5.N9.Q1` (parcours long **E5**).

**Branche BPGV « courte » côté E5** : uniquement **Q7** lorsque la bande dérivée reste **minimal** après ORS.

**Branche « longue »** : **Q1 → … → Q7** (avec la subtilité `Q7` : si `Q6` absent dans `answers`, le graphe saute à `Q12` — cas limite de données partielles).

---

## 7. Branche texte / média (chemin attendu)

```
Q9 → Q9.1 → Q11.0
  ├─ Q11.0.B → Q10 → E5…
  └─ Q11.0.A → Q11.1
        ├─ texte seul → T1 → (T1E ou T2) → [M1 si média aussi] → E5 ou M1…
        ├─ média seul → M1 → (M2 si M1.A) → Q10 si M2, sinon E5
        └─ texte + média → T1 → … → M1 → …
```

---

## 8. Scénarios de référence (recette)

À utiliser comme **ordre de questions attendu** + vérification **moteur** (niveau / impossible) côté `qualification-v3-decision` / API score — pas recalculé ici.

| Scénario | Chemin caractéristique | Niveau / état (rappel) |
|----------|-------------------------|-------------------------|
| Interdit ORS Q3.1 | … → `E5.N9.Q7` tôt | `unacceptable` |
| Interdit Q2.1 / Q3 | Idem court | `unacceptable` |
| Minimal non-produit | Pas Q4 ; `Q2.G` ; N8 minimal ; souvent Q10 si `Q11.0.B` | `minimal` |
| Produit + Annexe I high | Q4 réponse à risque élevé | `high` |
| Produit + Annexe I JNS | Q4 = JNS | `impossible` |
| Annexe III + 6.3 oui | Q5.A + domaine sensible | Bande BPGV sans inflation Q2 seule |
| Annexe III + 6.3 non / autre | Q5.B etc. | Bande peut monter avec Q2 |
| Limited interaction | Q9.A | `limited` (si autres pivots OK) |
| Limited biométrie | Q9.1.A (hors interdit) | `limited` |
| Texte intérêt public + contrôle éditorial | T1.A + T1E.A | Souvent **minimal** sur ce volet |
| Deepfake | M1.A (+ M2 selon cas) | `limited` + Q10 après M2 |

---

## 9. Règles d’interprétation (bug vs normal)

| Observation | Verdict |
|-------------|---------|
| Q10 absente alors que le parcours est « texte pur » sans média ni M2 | **Normal** |
| Q10 présente après `Q11.0.B` | **Normal** |
| E6.Q2 sans Q1 alors que Q9 = Non et Q11.0 = Oui | **Normal** |
| Q4 affichée avec `system_type` non « Produit » | **Bug** (graphe + façade) |
| `active_question_codes` contient une question jamais affichée pour les mêmes réponses | **Bug** à investiguer (version questionnaire / façade) |

---

## 10. Fichiers code

| Fichier | Rôle |
|---------|------|
| `app/usecases/[id]/utils/questionnaire-v3-graph.ts` | Graphe, `collectV3ActiveQuestionCodes`, métadonnées `bpgv_variant` / `ors_exit` |
| `app/usecases/[id]/utils/questionnaire-v3-progress.ts` | Barre de progression (DFS sur branches possibles) |
| `app/usecases/[id]/utils/questionnaire.ts` | Façade V1/V2/V3 pour l’UI |
| `lib/qualification-v3-decision.ts` | Décision réglementaire (hors navigation) |
| `lib/scoring-v3-server.ts` | Scoring + filtre `active_question_codes` |

---

*Document Lot C — à mettre à jour si le produit change le graphe ou les pivots.*
