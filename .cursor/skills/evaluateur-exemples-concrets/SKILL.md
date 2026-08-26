---
name: evaluateur-exemples-concrets
description: >-
  Guide le chat évaluateur AI Act (MaydAI) pour les néophytes : chaque question
  simple Oui/Non doit porter un exemple concret calé sur le cas d’usage, sans
  jargon inutile. Use when editing evaluation questions, chat-evaluation,
  NEW_QUESTION_NODE, evaluation-question-examples, contextualizeEvaluationQuestion,
  welcomeEvaluationMessage, buildWelcomeRecapMessage, or when the user mentions
  exemples concrets, vulgarisation, Persona Q1.2, ou compréhension des questions.
---

# Évaluateur — exemples concrets pour néophytes

Les questions binaires du questionnaire (Oui/Non) sont illisibles hors contexte. L’évaluateur conversationnel doit **réduire la charge cognitive** et **ancrer chaque question dans le cas d’usage réel**.

## Règle d’or

Ne jamais poser une question catalogue seule. Toujours :

1. Rappeler **le nom du cas** quand il est connu (`Pour « Traducteur HTML » :`).
2. Dire ce que **Oui** veut dire **dans ce métier** (preuve, geste, objet).
3. Dire ce que **Non** veut dire (le piège usuel : « on fait attention », contrat fournisseur, usage de ChatGPT).

Le jargon juridique (numéros d’articles, Annexe III, etc.) est réservé au Persona DPO/avocat (`E4.N7.Q1.2.C` / `D`). Pour métier / dirigeant / idée : mots simples, analogies, aucun article.

## Où ça vit

| Intention | Fichier |
|---|---|
| Exemples Oui/Non du chat | `lib/mistral/evaluation-question-examples.ts` |
| Injection (Q5 + exemples) | `contextualizeEvaluationQuestion` dans `lib/mistral/evaluation-tool.ts` |
| Passage du nom/description | 4e argument de `resolveNextEvaluationStep` / `graphStep` dans `app/api/chat/evaluation/route.ts` |
| Accueil étape 3 | `welcomeEvaluationMessage` dans `lib/mistral/evaluation-chat-session.ts` |
| Accueil profil (étape 1) | `buildWelcomeRecapMessage` dans `lib/mistral/company-profile-tool.ts` |

Ne pas dupliquer les exemples dans le JSON catalogue (`questions-with-scores.json`) : le questionnaire classique garde ses tooltips ; le **chat** a ses exemples concrets.

## Quand ajouter un exemple

Ajouter une entrée dans `SIMPLE_QUESTION_EXAMPLES` si :

- la question est un radio Oui/Non (éventuellement « Je ne sais pas ») ;
- l’énoncé est abstrait (« avez-vous un système de… ») ;
- le tooltip existant est du jargon (Art. 9, Art. 10…) sans cas métier.

Ne pas écraser Q5 (art. 6.3, déjà contextualisée) ni Q1.2 (Persona, boutons dédiés).

## Format d’un exemple

```
Oui : [geste ou preuve concrète, 1 phrase]. Non : [ce que les gens croient à tort].
```

`buildSimpleQuestionExample` préfixe automatiquement :

- avec nom → `Pour « {name} » : …`
- sans nom → `Exemple : …`

Adapter le **corps** pour qu’il reste vrai quel que soit le cas (traducteur, sas, RH). Les détails trop spécifiques (anglais→français, page HTML) vont dans l’**accueil** (`welcomeEvaluationMessage`), pas dans chaque question E5/E6.

## Accueil de l’étape 3

`welcomeEvaluationMessage` doit :

- reprendre le nom + l’objectif du cas (extraire `L’objectif principal est…`, retirer le boilerplate AI Act) ;
- poser l’**interaction réelle** (qui clique, que voit-on, une source/page d’origine est-elle citée ?) ;
- pour un cas traduction/HTML : exemple marketing + citation de la page d’origine.

Interdit : *« Pourriez-vous m'expliquer concrètement comment les utilisateurs finaux vont interagir avec cette IA ? »* sans résumé du cas.

## Charge cognitive (étape 1 profil)

Si le registre est **complet**, ne pas mentionner `NON_RENSEIGNE` ni « si un champ était vide ». Demander seulement de vérifier et valider.

`NON_RENSEIGNE` reste un jeton **interne** (system prompt agent), jamais un message utilisateur si rien ne manque.

## Persona et graphe

- Ne **jamais** forcer `E4.N7.Q1.2.A` dans `mapEvaluationNodesToAnswers` : le graphe pose le Persona.
- Q1.2 = boutons Quick Reply, pas de saisie libre.
- Contrôle d’accès (badge, sas, porte) ≠ Annexe III Emploi.

## Exemple de qualité (gestion des risques)

**Mauvais :** « Avez-vous établi et maintenez-vous un système de gestion des risques ? • Oui • Non »

**Bon :**

> Avez-vous établi et maintenez-vous un système de gestion des risques ?
>
> Pour « Traducteur HTML » : Oui : une fiche ou un process vivant qui liste les risques, un responsable, et quoi faire si ça dérape — revue au moins une fois par an. Non : « on fait attention » ou un document oublié.
>
> • Oui • Non

## Checklist avant de livrer une question chat

- [ ] Un néophyte comprend Oui vs Non sans connaître l’AI Act
- [ ] L’exemple reste vrai pour le cas d’usage courant (nom injecté)
- [ ] Pas d’article de loi pour un profil métier
- [ ] Pas de token `NON_RENSEIGNE` dans un recap déjà complet
- [ ] Test unitaire si nouvel ID dans `SIMPLE_QUESTION_EXAMPLES`
