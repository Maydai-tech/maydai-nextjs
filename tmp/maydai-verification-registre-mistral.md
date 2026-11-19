# MaydAI — Dossier de vérification du registre des modèles Mistral

**Destinataire :** équipe Mistral AI  
**Émetteur :** MaydAI (Mayday Consulting)  
**Date :** 19 septembre 2026  
**Statut :** brouillon à valider — **aucun changement n’a encore été écrit en base**

Merci de confirmer ou corriger les identités, alias et statuts ci-dessous.  
Pour chaque ligne : répondre **OUI** / **NON** / **CORRIGER** (et indiquer la valeur juste).

---

## 0. Cadre MaydAI (pour éviter les malentendus)

1. Le **hub MaydAI** est une fiche produit canonique (nom + slug stables). Il n’est **jamais** fusionné ni supprimé pour suivre un retrait API.
2. Les identifiants API (`codestral-2508`, `mistral-small-latest`…) sont des **identifiants sources**, pas le nom de la fiche.
3. Un alias `-latest` n’est **jamais** une fiche. Il est accroché à la version datée qu’il pointe **aujourd’hui**.
4. Si une fiche actuelle **regroupe plusieurs versions**, on la **sépare** (on ne supprime pas les scores : on les rattache à la bonne version).
5. Objectif : registre **le plus complet possible**, y compris l’historique retiré et les modèles audio Voxtral.

Sources utilisées de notre côté :

- [Models overview](https://docs.mistral.ai/getting-started/models/models_overview) (table Active + Deprecated & retired)
- [Changelog](https://docs.mistral.ai/resources/changelogs)
- Catalogue EcoLogits `provider = mistralai` (46 IDs API)

---

## 1. Questions d’identité — à trancher en priorité

Ces cas décident du nombre de fiches et des liens. Sans réponse, on ne touche pas à ces lignes.

### Q1. Alias `-latest` au 19 septembre 2026

| Alias API | Notre hypothèse (cible datée) | OUI / NON / CORRIGER |
|-----------|-------------------------------|----------------------|
| `codestral-latest` | `codestral-2508` | |
| `mistral-large-latest` | `mistral-large-2512` | |
| `mistral-medium-latest` | `mistral-medium-3.5` / `mistral-medium-3-5` | |
| `mistral-small-latest` | `mistral-small-2603` (Small 4) | |
| `devstral-latest` | `devstral-2512` (Devstral 2) | |
| `devstral-medium-latest` | `devstral-medium-2507` | |
| `magistral-medium-latest` | `magistral-medium-2509` | |
| `magistral-small-latest` | `magistral-small-2509` | |
| `ministral-14b-latest` | Ministral 3 **14B Instruct** 2512 | |
| `ministral-8b-latest` | Ministral 3 **8B Instruct** 2512 | |
| `ministral-3b-latest` | Ministral 3 **3B Instruct** 2512 | |
| `pixtral-12b-latest` | `pixtral-12b-2409` | |
| `voxtral-mini-latest` | `voxtral-mini-2602` (Transcribe 2) ? | |
| `voxtral-small-latest` | `voxtral-small-2507` | |
| `mistral-tiny-latest` | **inconnu** — cet alias existe-t-il encore ? | |

### Q2. Même produit, ou versions distinctes ?

| ID / nom A | ID / nom B | Notre hypothèse | OUI = même produit / NON = fiches séparées |
|------------|------------|-----------------|--------------------------------------------|
| `mistral-medium-3.5` | `mistral-medium-3-5` | Même modèle, deux graphies | |
| `mistral-medium-2604` | Mistral Medium 3.5 (fiche avril 2026) | Même snapshot (`26.04`) | |
| `mistral-large-2512` | Mistral Large 3 (675B Instruct 2512) | Large 3 officiel = 2512 Instruct 675B | |
| `mistral-large-3-2509` | `mistral-large-2512` | **Versions distinctes** (sept. vs déc. 2025) | |
| `ministral-14b-2512` (API courte) | `ministral-3-14b-instruct-2512` | Même produit Instruct, pas Base ni Reasoning | |
| `ministral-8b-2512` | `ministral-3-8b-instruct-2512` | Idem | |
| `ministral-3b-2512` | `ministral-3-3b-instruct-2512` | Idem | |
| `open-mistral-nemo` | `open-mistral-nemo-2407` | Même NeMo 12B juillet 2024 | |
| `mistral-nemo-instruct-2407` | `open-mistral-nemo-2407` | Même poids Instruct | |
| `pixtral-12b` | `pixtral-12b-2409` | Même Pixtral 12B | |
| `pixtral-large` | `pixtral-large-2411` | Même Pixtral Large | |
| `open-mistral-7b` | Mistral 7B v0.3 | `open-mistral-7b` = v0.3 (plus v0.2) | |
| `mistral-small-2603` | Mistral Small 4 | Même modèle (annonce 16 mars 2026) | |
| `codestral-2405` | Codestral-22B (poids HF) | **Distinct** de l’API Codestral 25.08 ; 2405 = 22B ? | |
| `voxtral-mini-2507` (chat) | `voxtral-mini-2507` (transcription) | **Deux usages, un seul ID** — confirmer | |

### Q3. Ces IDs existent-ils officiellement ?

Absents de la table Deprecated & retired et/ou du changelog public.

| ID | Vu dans EcoLogits | Notre hypothèse | Existe ? (OUI/NON) | Si oui : nom + statut + remplacé par |
|----|-------------------|-----------------|--------------------|--------------------------------------|
| `codestral-2411-rc5` | oui | Release candidate, jamais finalisée | | |
| `codestral-2412` | oui | Version intermédiaire | | |
| `mistral-tiny-2407` | oui | Pas de fiche publique | | |
| `mistral-tiny-latest` | oui | Alias orphelin | | |
| `voxtral-mini-2509` | oui | Entre 2507 et Transcribe 2 (2602) | | |
| `mistral-medium` (sans date) | oui | Ancien alias de `mistral-medium-2312` | | |

---

## 2. Regroupements suspects dans MaydAI (à corriger)

Une fiche MaydAI ne doit plus représenter plusieurs versions. Merci de nous dire **quelle version porte les scores** quand une fiche est générique.

| # | Fiche MaydAI actuelle | Scores COMPL-AI | Identifiants déjà collés | Problème | Correction proposée | Votre avis |
|---|----------------------|-----------------|--------------------------|----------|---------------------|------------|
| G1 | Magistral Medium | 25 | `magistral-medium` (sans date) | 3 versions officielles : 2506 (1.0), 2507 (1.1), 2509 (1.2) | Dater la fiche selon la version des scores ; **créer** les deux autres | Quelle version = ces 25 scores ? |
| G2 | ministral-3 | 24 | aucun | Nom de famille, 9 variantes 2512 déjà en base | Garder comme fiche famille **ou** rattacher les scores à 3B/8B/14B × Instruct | Quelle variante ? |
| G3 | mistral-large-3-675b | 24 | aucun | Voisine de Large 3, 675B Base, 675B Instruct 2512 | Rattacher à Instruct 2512 **ou** garder comme fiche famille 675B | Même produit que Instruct 2512 ? |
| G4 | Mistral Large 3 | 0 | `mistral-large-3-2509` | Le Large 3 officiel public est v25.12 | **Garder** comme snapshot 2509 distinct de 2512 | 2509 est-il un vrai release ? |
| G5 | Mistral Large 3 (675B Instruct 2512) | 0 | `mistral-large-latest` seulement | L’alias `-latest` bougera | Ajouter l’ID stable `mistral-large-2512` | OUI / NON |
| G6 | mistral-small-3-24b | 24 | aucun | Voisine de Small 3 24B Base et Instruct (2501) | Rattacher les scores à Instruct 2501 **ou** Base 2501 | Quelle variante ? |
| G7 | Mistral Small 4 | 24 | `mistral-small-latest` seulement | Alias mobile | Ajouter `mistral-small-2603` | OUI / NON |
| G8 | Ministral 3 (14B / 8B / 3B Reasoning) | 0 | `ministral-*-latest` | Alias latest collé sur Reasoning au lieu d’Instruct | Déplacer latest → Instruct ; **garder** les 3 fiches Reasoning | OUI / NON |
| G9 | Mistral Small | 0 | `mistral-small-2409` | Ne **pas** confondre avec Mixtral 8x7B (alias 2023) | Rester Small 2.0 retiré | Confirmer |
| G10 | Codestral-22B | 0 | `codestral-22b` | Ne **pas** y coller `codestral-2508` | Fiches séparées | Confirmer que 22B = poids 2024, pas l’API 25.08 |

---

## 3. Inventaire MaydAI actuel (38 fiches — aucune suppression)

Statuts proposés d’après votre table publique au 19/09/2026. Corriger si besoin.

| Nom MaydAI | ID source déjà connu | Statut proposé | Remplacé par (si retiré) | OK ? |
|------------|----------------------|----------------|--------------------------|------|
| Mistral Medium 3.5 | `mistral-medium-3-5` | Actif | — | |
| Mistral Small 4 | `mistral-small-latest` | Actif | — | |
| Mistral Large 3 | `mistral-large-3-2509` | Actif **si 2509 = Large 3** / sinon snapshot | Large 3 2512 ? | |
| mistral-large-3-675b | — | Actif (famille ?) | — | |
| Mistral Large 3 (675B Base) | `mistral-large-3-675b-base-2512` | Actif | — | |
| Mistral Large 3 (675B Instruct 2512) | `mistral-large-latest` | Actif | — | |
| Mistral Large 3 (675B Instruct 2512 Eagle) | `…-eagle` | Actif (quantification) | — | |
| Mistral Large 3 (675B Instruct 2512 NVFP4) | `…-nvfp4` | Actif (quantification) | — | |
| ministral-3 | — | Actif (famille) | — | |
| Ministral 3 (14B / 8B / 3B Base, Instruct, Reasoning) × 9 | IDs `ministral-3-*-2512` (sauf latest mal placés) | Actif | — | |
| Shieldstral 1.0 (3B) | `shieldstral-1.0-3b` | Actif | — | |
| Codestral-22B | `codestral-22b` | Retiré (API 2405) ; poids HF toujours publics | Codestral 25.08 | |
| Devstral Medium | `devstral-medium-2507` | Retiré (31/05/2026) | Medium 3.5 | |
| Devstral Small 1.1 | `devstral-small-2507` | Retiré (31/05/2026) | Small 4 | |
| Magistral Medium | `magistral-medium` | Retiré | Medium 3.5 | |
| Magistral Small 2506 | `magistral-small-2506` | Retiré (30/11/2025) | Small 4 | |
| Ministral 8B Instruct | `ministral-8b-instruct-2410` | Retiré (31/12/2025) | Ministral 3 8B | |
| mistral-7b-instruct-v0.2 | — | Retiré (30/03/2025) | Ministral 3 8B | |
| mistral-7b-v0.3 | — | Retiré (30/03/2025) | Ministral 3 8B | |
| Mistral Large 2 | `mistral-large-2-2407` | Retiré (30/03/2025) | Large 3 | |
| Mistral NeMo Instruct | `mistral-nemo-instruct-2407` | Retiré (31/07/2026) | Ministral 3 8B | |
| Mistral Small | `mistral-small-2409` | Retiré (30/11/2025) | Small 4 | |
| Mistral Small 3 24B Base / Instruct | `mistral-small-24b-*-2501` | Retiré (30/11/2025) | Small 4 | |
| Mistral Small 3.1 24B Base / Instruct | `mistral-small-3.1-24b-*-2503` | Retiré (30/11/2025) | Small 4 | |
| Mistral Small 3.2 24B Instruct | `mistral-small-3.2-24b-instruct-2506` | Retiré (31/07/2026) | Small 4 | |
| mistral-small-3-24b | — | Retiré (à dater) | Small 4 | |
| Pixtral-12B | `pixtral-12b-2409` | Retiré (31/12/2025) | Ministral 3 14B | |
| Pixtral Large | `pixtral-large` | Retiré (31/05/2026) | Medium 3.5 | |

---

## 4. Fiches que nous prévoyons de **créer** (historique + complétude)

Aucune de ces créations n’écrase une fiche existante.

### 4.1 Déjà actés côté MaydAI, sous réserve de vos IDs

| Nom prévu MaydAI | ID API à attacher | Statut proposé | Remplacé par | OK ? |
|------------------|-------------------|----------------|--------------|------|
| Codestral 25.08 | `codestral-2508` + alias `codestral-latest` | Actif | — | |
| Codestral 25.01 | `codestral-2501` | Retiré (30/11/2025) | Codestral 25.08 | |
| Codestral 24.05 | `codestral-2405` | Retiré (16/06/2025) | Codestral 25.08 | |
| Devstral 2 | `devstral-2512` + alias `devstral-latest` | Retiré (31/07/2026) | Medium 3.5 | |
| Magistral Medium 1.2 | `magistral-medium-2509` + alias `magistral-medium-latest` | Retiré (31/07/2026) | Medium 3.5 | |
| Magistral Small 1.2 | `magistral-small-2509` + alias `magistral-small-latest` | Retiré (31/07/2026) | Small 4 | |
| Mistral Medium 3 | `mistral-medium-2505` | Retiré (31/08/2026) | Medium 3.5 | |
| Mistral Medium 3.1 | `mistral-medium-2508` | Retiré (31/08/2026) | Medium 3.5 | |
| Mistral Medium 1.0 | `mistral-medium-2312` (+ ancien `mistral-medium` si confirmé) | Retiré (16/06/2025) | Medium 3.5 | |
| Voxtral Small | `voxtral-small-2507` + `voxtral-small-latest` | Actif (v25.07) | — | |
| Voxtral Mini (chat) | `voxtral-mini-2507` | Retiré (31/05/2026) | Transcribe 2 | |
| Voxtral Mini Transcribe | `voxtral-mini-2507` (même ID ?) | Retiré (31/05/2026) | Transcribe 2 | |
| Voxtral Mini Transcribe 2 | `voxtral-mini-2602` + `voxtral-mini-latest` ? | Actif | — | |
| Voxtral Mini Transcribe Realtime | `voxtral-mini-transcribe-realtime-2602` | Actif | — | |
| Voxtral TTS | `voxtral-tts-2603` | Actif | — | |

### 4.2 Créations **conditionnelles** (uniquement si Q3 = OUI)

| Nom prévu | ID | Si NON |
|-----------|-----|--------|
| Codestral 24.11 RC5 | `codestral-2411-rc5` | On n’crée pas la fiche ; ID laissé non lié |
| Codestral 24.12 | `codestral-2412` | Idem |
| Voxtral Mini 25.09 | `voxtral-mini-2509` | Idem |
| Mistral Tiny 24.07 | `mistral-tiny-2407` | Idem |

### 4.3 Absents d’EcoLogits mais présents dans votre table officielle — les ajoutons-nous ?

| Nom | ID API | Statut officiel | Ajouter au hub MaydAI ? (OUI/NON) |
|-----|--------|-----------------|-----------------------------------|
| Magistral Medium 1.1 | `magistral-medium-2507` | Retiré 30/11/2025 | |
| Magistral Medium 1.0 | `magistral-medium-2506` | Retiré 30/11/2025 | |
| Magistral Small 1.1 | `magistral-small-2507` | Retiré 30/11/2025 | |
| Devstral Small 1.0 | `devstral-small-2505` | Retiré 30/11/2025 | |
| Devstral Small 2 | `labs-devstral-small-2512` | Retiré 31/03/2026 | |
| Mistral Large 2.1 | `mistral-large-2411` | Retiré 31/05/2026 | |
| Mistral Large 1.0 | `mistral-large-2402` | Retiré 16/06/2025 | |
| Mistral Small 1.0 | `mistral-small-2402` | Retiré 16/06/2025 | |
| Mixtral 8x7B | `open-mixtral-8x7b` | Retiré 30/03/2025 | |
| Mixtral 8x22B | `open-mixtral-8x22b` | Retiré 30/03/2025 | |
| Codestral Mamba 7B | `open-codestral-mamba` | Retiré 06/06/2025 | |
| Mathstral 7B | (poids, pas d’ID API ?) | Retiré | |
| Mistral Saba | `mistral-saba-2502` | Retiré 30/09/2025 | |
| Mistral Small Creative | `labs-mistral-small-creative` | Retiré 30/04/2026 | |
| Leanstral 1.5 / Leanstral 26.03 | `labs-leanstral-2603` | 1.5 actif ; 26.03 retiré | |
| Mistral Moderation 2 | (ID 26.03 ?) | Actif | |
| OCR 4.1 / 4.0 / 3 | IDs OCR | Hors LLM ? | |
| Codestral Embed / Mistral Embed | IDs embed | Hors LLM ? | |
| Z.ai GLM 5.3 / 5.2 | (tiers, API Mistral) | Hors marque Mistral ? | |

Notre intention actuelle : **ajouter tous les LLM / audio / code / safety** de la table ; **laisser de côté** OCR, embeddings et modèles tiers sauf avis contraire.

---

## 5. Liens EcoLogits prévus (sans créer de doublon)

| ID EcoLogits `mistralai` | Action prévue | Cible MaydAI |
|--------------------------|---------------|--------------|
| `mistral-medium-3-5` | déjà lié | Mistral Medium 3.5 |
| `mistral-medium-3.5` | lier (même produit si Q2 OK) | Mistral Medium 3.5 |
| `mistral-medium-latest` | lier (alias) | Mistral Medium 3.5 |
| `mistral-medium-2604` | lier **si** = 3.5 | Mistral Medium 3.5 |
| `pixtral-12b` | déjà lié | Pixtral-12B |
| `pixtral-12b-2409` / `pixtral-12b-latest` | lier (alias / date) | Pixtral-12B |
| `mistral-small-2603` / `mistral-small-latest` | lier | Mistral Small 4 |
| `mistral-small-2506` | lier | Mistral Small 3.2 24B Instruct |
| `mistral-large-2512` / `mistral-large-latest` | lier | Large 3 (675B Instruct 2512) |
| `ministral-14b-2512` / `14b-latest` | lier **si** = Instruct | Ministral 3 (14B Instruct 2512) |
| `ministral-8b-2512` / `8b-latest` | idem | Ministral 3 (8B Instruct 2512) |
| `ministral-3b-2512` / `3b-latest` | idem | Ministral 3 (3B Instruct 2512) |
| `open-mistral-nemo` / `open-mistral-nemo-2407` | lier | Mistral NeMo Instruct |
| `open-mistral-7b` | lier | mistral-7b-v0.3 |
| `devstral-medium-latest` | lier | Devstral Medium |
| `codestral-2508` / `codestral-latest` | lier après création | Codestral 25.08 |
| `codestral-2501` / `2405` / (RC, 2412 si Q3) | lier après création | fiches dédiées |
| `devstral-2512` / `devstral-latest` | lier après création | Devstral 2 |
| `magistral-*-2509` / `*-latest` | lier après création | Magistral 1.2 |
| `voxtral-*` | lier après création | fiches Voxtral |
| `mistral-medium` / `2505` / `2508` / `3` | lier après création | Medium 1.0 / 3 / 3.1 |
| `mistral-tiny-*` | lier seulement si Q3 = OUI | fiche Tiny ou 7B |

**Interdit (déjà tranché MaydAI) :**

- ne pas lier `codestral-2508` → Codestral-22B  
- ne pas lier `devstral-2512` → Devstral Medium  
- ne pas renommer Mistral Small → Mixtral 8x7B  

---

## 6. Corrections de données MaydAI (indépendantes de nouveaux IDs)

| Correction | Détail | OK ? |
|------------|--------|------|
| Typo | `Min  istral 3 (3B Reasoning 2512)` → `Ministral 3 (3B Reasoning 2512)` ; slug `min-istral-…` → `ministral-3-3b-reasoning-2512` | |
| Alias latest | retirer `ministral-14b-latest`, `ministral-8b-latest`, `ministral-3b-latest` des fiches Reasoning ; les poser sur Instruct | |
| Casse | `MiniStral 3 (14B Instruct 2512)` → `Ministral 3 (14B Instruct 2512)` | |

---

## 7. Ce que nous ne ferons pas

- Supprimer ou archiver une des 38 fiches existantes.
- Remplacer une fiche datée par son successeur.
- Créer une fiche dont le nom est uniquement `-latest`.
- Utiliser EcoLogits `is_active` comme statut (ce drapeau = présence catalogue, pas votre cycle de vie).

---

## 8. Réponse type (à copier)

```
Q1 alias latest : … (corrections : …)
Q2 mêmes produits : … (exceptions : …)
Q3 IDs douteux : 2411-rc5=  ; 2412=  ; tiny-2407=  ; voxtral-mini-2509=  ; mistral-medium=  

G1 Magistral Medium scores = 2506 / 2507 / 2509 / autre :
G2 ministral-3 scores = 
G3 675b générique = Instruct 2512 ? 
G4 large-3-2509 = vrai release ?
G6 small-3-24b scores = Base / Instruct / autre

4.3 ajouts officiels manquants : OUI pour LLM+audio+code+safety ; NON pour OCR/embed/tiers
  exceptions :

OK pour créer 4.1 : OUI / NON
OK corrections typo + latest : OUI / NON
```

Contact MaydAI pour le retour : à compléter avant envoi.

*Document préparé pour relecture interne puis envoi Mistral — 19 septembre 2026.*
