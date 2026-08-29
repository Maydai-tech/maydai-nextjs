# Documentation technique MaydAI

Index pour scanner les runbooks et références. Les règles Cursor (`.cursor/rules/`) restent la contrainte de code ; les pages ci-dessous décrivent l’intention, les interfaces et l’exploitation.

## Parcours produit

| Document | Sujet |
|----------|--------|
| [chat-assistant-parcours.md](./chat-assistant-parcours.md) | Parcours Chat IA (3 étapes), APIs Mistral, tracking `assistant` |
| [questionnaire-v3-parcours.md](./questionnaire-v3-parcours.md) | Graphe V3, `active_question_codes`, court vs long |
| [questionnaire-v3-simplification-produit.md](./questionnaire-v3-simplification-produit.md) | Spec produit du parcours court |
| [v3-short-path-analytics-events.md](./v3-short-path-analytics-events.md) | Événements GTM du parcours court |

## Hub LLM, RAG, webhooks

| Document | Sujet |
|----------|--------|
| [llm-models-hub.md](./llm-models-hub.md) | `compl_ai_models` + pivot `llm_model_source_ids`, crons, Compar:IA |
| [ai-act-rag.md](./ai-act-rag.md) | Ingestion Drive `05_AI_Act_Docs` → pgvector (pas encore consommé par le chat) |

## Auth, ops, setup

| Document | Sujet |
|----------|--------|
| [api-auth-security.md](./api-auth-security.md) | Bearer, `verifyAdminAuth`, crons, webhooks, invitations |
| [guide-installation-mcp-supabase.md](./guide-installation-mcp-supabase.md) | MCP Supabase OVH |
| [supabase-ovh-cli.md](./supabase-ovh-cli.md) | CLI Supabase self-hosted |

## Notes historiques (ne plus suivre pour de nouvelles colonnes)

Les implémentations Perplexity / notes-variantes décrivent d’anciens chemins admin. Le hub canonique est [llm-models-hub.md](./llm-models-hub.md).

- [PERPLEXITY_MODELS_IMPLEMENTATION.md](./PERPLEXITY_MODELS_IMPLEMENTATION.md)
- [ENRICHISSEMENT_MODELS_IMPLEMENTATION.md](./ENRICHISSEMENT_MODELS_IMPLEMENTATION.md)
