# Parcours Chat IA — architecture et APIs

Référence du flux conversationnel livré en août 2026. Le graphe de questions reste le moteur V3 (`getNextQuestionV3`) ; Mistral reformule et persiste, il ne choisit pas la prochaine question.

Règle Cursor associée : `.cursor/rules/mistral-conversational-flow.mdc`.

## 1. Intention

Donner un troisième mode d’évaluation à côté des questionnaires court / long :

1. **Accueil** — verrouiller le profil juridique du registre (`companies`).
2. **Brouillon** — saisir les champs setup du cas d’usage (déterministe).
3. **Évaluateur** — poser les questions V3 en conversation, puis générer le rapport.

Le hub `/chat` n’active aujourd’hui que « Créer un cas d’usage ». Les cartes « Pédagogie AI Act » et support sont des placeholders UI.

## 2. Entrées UI

| Surface | Route | Suite |
|---------|--------|--------|
| Sidebar « Chat IA » | `/chat` | Lien vers `/usecases/new/setup-chat` |
| Hub création | `/usecases/new?company=` | Carte Chat → `useCaseRoutes.setupChat(companyId)` |
| Cadrage | `/usecases/new/setup-chat?company=` | Étapes 1–2 |
| Évaluation | `/usecases/[id]/chat-evaluation` | Étape 3 + rapport |

Fichiers : `app/(saas)/chat/ChatLandingPage.tsx`, `CreateUseCaseHub.tsx`, `SetupChatPage.tsx`, `ChatEvaluationPage.tsx`.

## 3. Flux (ce que le code fait vraiment)

```
/chat ou hub création
        │
        ▼
setup-chat ── WelcomeChatInterviewer ── POST /api/chat/setup  (phase=welcome)
        │         tool confirm_company_profile → UPDATE companies
        ▼
   GuidedChat (déterministe, sans Mistral)
        │         POST /api/usecases via useCreateUseCase
        │         afterCreate → /usecases/{id}/chat-evaluation
        ▼
chat-evaluation ── GET/POST /api/chat/evaluation
        │         PATH_COMPLETE → POST /api/chat/generate-report
        ▼
   rapport + clôture evaluation_path_runs (path_mode=assistant)
```

### Étape 1 — Accueil

- UI : `WelcomeChatInterviewer` + `ChatFlowStepper` (étape 1).
- API : `POST /api/chat/setup` avec `{ messages, company_id, phase: "welcome" }`.
- Auth : Bearer (`getAuthenticatedSupabaseClient`). Accès registre via `loadCompanyProfile` / `user_companies`.
- Tool : `confirm_company_profile`. Champs requis hors nom : secteur, sous-secteur, pays, rue, CP, ville. L’adresse incomplète renvoie un `MESSAGE` (pas un 422).
- Agent : `MISTRAL_CONVERSATION_AGENT_ID` (défaut `ag_01a01a3cde77754c83c3cf55366858d8`).
- Transition : succès tool → écran « Profil enregistré » → `guided_draft` **sans reload**.

### Étape 2 — Brouillon (UI actuelle)

- UI : `GuidedChat` (9 champs). **Mistral n’est pas appelé.**
- Persist : `useCreateUseCase` → `POST /api/usecases` (même contrat que le formulaire classique).
- Redirection : `useCaseRoutes.chatEvaluation(id)` (pas `select-path`).
- `primary_model_id` : matching côté formulaire GuidedChat (peut rester `null`).

`SetupChatInterviewer` + le tool `save_usecase_setup` existent encore (`POST /api/chat/setup` sans `phase=welcome`) mais **ne sont pas montés** par `SetupChatPage`. Ne pas les prendre pour le chemin utilisateur.

### Étape 3 — Évaluateur

- Auth : Bearer + `loadEvaluationContext` (accès cas d’usage).
- Chef d’orchestre : `resolveNextEvaluationStep` avec `CONVERSATIONAL_PATH_MODE = 'long'` (E5 / E6 inclus).
- GET `/api/chat/evaluation?usecase_id=` : `NOT_STARTED` si aucune réponse ; sinon prochaine question ou `PATH_COMPLETE`.
- POST : Mistral (`MISTRAL_EVALUATION_AGENT_ID`) + tools `save_single_answer` / `save_evaluation_nodes`. Le graphe dicte la suite.
- Persona `E4.N7.Q1.2` : boutons Quick Reply côté UI. Ton injecté dans le system prompt :
  - `C` / `D` → jargon juridique (DPO / avocat)
  - `A` / `B` / `E` → vulgarisation métier
  - autre / absent → ton pédagogique par défaut
- Q5 Annexe III : un mismatch remet `E4.N7.Q2` à « Aucun » (`E4.N7.Q2.G`) et retire Q5.

### Rapport

- `POST /api/chat/generate-report` `{ usecase_id }` — Bearer, `maxDuration` 120 s.
- Agent : `MISTRAL_REPORT_AGENT_ID`, timeout 40 s × 2 retries (`lib/mistral/report-timeouts.ts`).
- Client : abandon à 100 s (`CHAT_GENERATE_REPORT_CLIENT_TIMEOUT_MS`) pour éviter un spinner infini.
- Enchaîne scoring (`calculateAndPersistUseCaseScore`), persist rapport, clôture best-effort du run `assistant`.

## 4. Tracking first-party

Distinct de `usecases.path_mode` (court / long).

| Constante | Valeur | Où |
|-----------|--------|-----|
| `ASSISTANT_PATH_RUN_MODE` | `assistant` | `evaluation_path_runs.path_mode` |
| `ASSISTANT_ENTRY_SURFACE` | `chat_evaluation` | start run |
| `CONVERSATIONAL_PATH_MODE` | `long` | graphe V3 côté chat |

Démarrage : `POST /api/usecases/[id]/evaluation-runs/start` depuis `ChatEvaluationPage`.  
Clôture : `completeOpenEvaluationPathRun` (ne doit pas faire échouer le métier).  
Admin : `/admin/evaluation-path-runs` inclut le mode `assistant` (CSV + stats).

Ce n’est **pas** l’instrumentation GTM du parcours court (`docs/v3-short-path-analytics-events.md`).

## 5. Contrats API (exemples)

```http
POST /api/chat/setup
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phase": "welcome",
  "company_id": "11111111-1111-1111-1111-111111111111",
  "messages": [{ "role": "user", "content": "Oui, c’est bien notre siège." }]
}
```

Réponses : `{ "type": "MESSAGE", "content": "…" }` ou `{ "type": "TOOL_CALL", "tool": "confirm_company_profile", "profileConfirmed": true, … }`.

```http
POST /api/chat/evaluation
Authorization: Bearer <access_token>

{
  "usecase_id": "22222222-2222-2222-2222-222222222222",
  "messages": [{ "role": "user", "content": "Oui" }]
}
```

Types : `NEW_QUESTION_NODE` | `PATH_COMPLETE` | `NOT_STARTED` (GET uniquement).

## 6. Variables d’environnement

| Variable | Rôle |
|----------|------|
| `MISTRAL_API_KEY` | SDK agents + embeddings RAG |
| `MISTRAL_CONVERSATION_AGENT_ID` | Accueil / tool setup (optionnel, défaut en code) |
| `MISTRAL_EVALUATION_AGENT_ID` | Évaluateur |
| `MISTRAL_REPORT_AGENT_ID` | Rapport structuré |

Sans clé : `getMistralClient()` échoue au runtime.

## 7. Pièges

- **Ne pas faire choisir la prochaine question par Mistral.** Toute navigation passe par `resolveNextEvaluationStep`.
- **Ne pas forcer `E4.N7.Q1.2.A`** dans le moteur. Le frontend affiche des boutons ; le backend lit la réponse pour le ton.
- **`/api/mistral/conversation`** est une route distincte (conversation générique). Le parcours cas d’usage passe par `/api/chat/*`.
- **`/api/mistral/generate-description`** exige un Bearer (plus d’accès anonyme).
- Le RAG AI Act est **ingéré** (webhook KB) mais **aucune** route chat n’appelle `match_ai_act_chunks` aujourd’hui. Voir [ai-act-rag.md](./ai-act-rag.md).
- `SetupChatInterviewer` n’est pas le chemin UI : le modifier ne change pas `/setup-chat`.

## 8. Fichiers clés

| Couche | Fichiers |
|--------|----------|
| Pages | `SetupChatPage.tsx`, `ChatEvaluationPage.tsx`, `ChatLandingPage.tsx` |
| Interviewers | `components/chat/WelcomeChatInterviewer.tsx`, `EvaluationChatInterviewer.tsx` |
| APIs | `app/api/chat/setup`, `evaluation`, `generate-report` |
| Moteur | `lib/mistral/evaluation-graph-orchestrator.ts`, `load-evaluation-context.ts` |
| Persist | `persist-company-profile.ts`, `persist-evaluation-answers.ts`, `persist-chat-report.ts` |
