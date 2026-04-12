# PDF léger — pré-diagnostic parcours court (V3)

## Route

`GET /api/usecases/:id/prediagnostic-pdf`  
Authentification : header `Authorization: Bearer <token>` (même schéma que le rapport PDF complet).

## Conditions

- Cas en **questionnaire V3** uniquement (`400` sinon).
- Utilisateur autorisé sur l’entreprise du cas (`403` sinon).
- **Aucune** exigence de statut « complété » ni de score final : le document reflète les **réponses déjà enregistrées** (comme l’écran de fin du parcours court).

## Contenu

Aligné sur `buildV3PrediagnosticPdfModel` et le vocabulaire `DECLARATION_PROOF_FLOW_COPY` / sortie courte : fil rouge, qualification, implications, périmètre établi, hors périmètre, pourquoi le long, liens (si `NEXT_PUBLIC_SITE_URL` ou `NEXT_PUBLIC_APP_URL` définis), distinction explicite avec le **rapport d’audit PDF complet** (parcours long).

## Fichiers

- `app/api/usecases/[id]/prediagnostic-pdf/route.ts` — génération serveur (`renderToBuffer`).
- `app/usecases/[id]/components/pdf/PDFV3PrediagnosticDocument.tsx` — mise en page une page A4.
- `app/usecases/[id]/utils/v3-prediagnostic-pdf-model.ts` — assemblage des données (même moteur `resolveQualificationOutcomeV3` que le client).
