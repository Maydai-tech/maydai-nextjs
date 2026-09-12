# Documentation technique MaydAI

Index pour scanner les runbooks et références. Les règles Cursor (`.cursor/rules/`) restent la contrainte de code ; les pages ci-dessous décrivent l’intention, les interfaces et l’exploitation.

## Parcours produit

| Document | Sujet |
|----------|--------|
| [chat-assistant-parcours.md](./chat-assistant-parcours.md) | Parcours Chat IA (3 étapes), APIs Mistral, tracking `assistant` |
| [questionnaire-v3-parcours.md](./questionnaire-v3-parcours.md) | Graphe V3, `active_question_codes`, court vs long |
| [questionnaire-v3-simplification-produit.md](./questionnaire-v3-simplification-produit.md) | Spec produit du parcours court |
| [v3-short-path-analytics-events.md](./v3-short-path-analytics-events.md) | Événements GTM du parcours court |

Chat IA (3 étapes, `/api/chat/*`) : règle `.cursor/rules/mistral-conversational-flow.mdc`. L’UI réelle de `/usecases/new/setup-chat` est `GuidedChat`, pas `SetupChatInterviewer`.

## Hub LLM, System Cards, RAG

| Document | Sujet |
|----------|--------|
| [llm-models-hub.md](./llm-models-hub.md) | `compl_ai_models` + pivot `llm_model_source_ids`, crons, Compar:IA |
| [llm-system-cards.md](./llm-system-cards.md) | Fiches GPAI, Tour de contrôle Drive, bonus score, PDF |
| [ai-act-rag.md](./ai-act-rag.md) | Ingestion veille `AI_Act_Index.json` → pgvector (pas encore consommé par le chat) |

Hub canonique LLM : `.cursor/rules/llm-models-hub.mdc`. Sync Drive Hermes : `.cursor/rules/hermes-drive-sync.mdc`.

## Auth, ops, setup

| Document | Sujet |
|----------|--------|
| [api-auth-security.md](./api-auth-security.md) | Bearer, `verifyAdminAuth`, crons, webhooks, invitations |
| [guide-installation-mcp-supabase.md](./guide-installation-mcp-supabase.md) | MCP Supabase OVH |
| [supabase-ovh-cli.md](./supabase-ovh-cli.md) | CLI Supabase self-hosted |

Auth API : `.cursor/rules/api-architecture.mdc`, `.cursor/rules/authentication-patterns.mdc`. Webhooks Hermes : header `x-api-key` = `INTERNAL_API_KEY`. Crons Vercel : Bearer `CRON_SECRET`.

## Notes historiques (ne plus suivre pour de nouvelles colonnes)

Les notes Perplexity / enrichissement décrivent d’anciens chemins admin. Toute source externe passe par `llm_model_source_ids`, jamais par une colonne dénormalisée sur `compl_ai_models`.

- [PERPLEXITY_MODELS_IMPLEMENTATION.md](./PERPLEXITY_MODELS_IMPLEMENTATION.md)
- [ENRICHISSEMENT_MODELS_IMPLEMENTATION.md](./ENRICHISSEMENT_MODELS_IMPLEMENTATION.md)
