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
| [llm-models-hub.md](./llm-models-hub.md) | Hub : slug + pivot, taxonomie, licence, cycle de vie, CSV COMPL-AI, EcoLogits N:1, Compar:IA Etalab, crons |
| [llm-system-cards.md](./llm-system-cards.md) | Fiches GPAI, piliers Markdown, Tour de contrôle (sync / apply / A1–A9), bonus score, PDF |
| [ai-act-rag.md](./ai-act-rag.md) | Ingestion veille `AI_Act_Index.json` → pgvector (pas encore consommé par le chat) |

Hub canonique LLM : `.cursor/rules/llm-models-hub.mdc`. Compar:IA Etalab : `.cursor/rules/comparia-etalab.mdc`. Sync Drive Hermes : `.cursor/rules/hermes-drive-sync.mdc`.

## Auth, ops, setup

| Document | Sujet |
|----------|--------|
| [api-auth-security.md](./api-auth-security.md) | Bearer, `verifyAdminAuth`, crons (LLM + purge), webhooks, invitations (Zero Overwrite), rôles `profiles`, preuves dossier (signed URL), checkout Stripe Basil, révocation `user_companies`, `login-method` |
| [auth-mot-de-passe.md](./auth-mot-de-passe.md) | Connexion email + mot de passe (MAY-6), code pour les anciens comptes, liens `token_hash`, GoTrue OVH |
| [signup-partner-landings.md](./signup-partner-landings.md) | Inscription (mot de passe + lien de confirmation), landings `/p/…` (Learning Gate), UTM, merge `complete-signup` |
| [freemium-governance.md](./freemium-governance.md) | Quota Freemium, confirmation Mailjet, cron `process-purges`, `/admin/governance` |
| [contact-form-security.md](./contact-form-security.md) | Formulaire contact : honeypot, Turnstile, TLD, CSP Cloudflare |
| [admin-monitoring.md](./admin-monitoring.md) | `/admin/monitoring`, URLs hôte en dur, carte rotation des logs, Caddy / nginx |
| [e2e-playwright.md](./e2e-playwright.md) | Playwright local + CI (Node 24, `pnpm`), login en deux temps, plus de rapport OVH |
| [guide-installation-mcp-supabase.md](./guide-installation-mcp-supabase.md) | MCP Supabase OVH |
| [supabase-ovh-cli.md](./supabase-ovh-cli.md) | CLI Supabase self-hosted |

Auth API : `.cursor/rules/api-architecture.mdc`, `.cursor/rules/authentication-patterns.mdc`. Webhooks Hermes : header `x-api-key` = `INTERNAL_API_KEY`. Crons Vercel : Bearer `CRON_SECRET` (LLM Stats 04:00 UTC mercredi, Tour de contrôle 06:00 UTC mercredi, EcoLogits 03:00 UTC quotidien, purges Freemium `*/15`). Pas de cron Compar:IA. Monitoring hôte : jamais d’HTTP public.

## Notes historiques (ne plus suivre pour de nouvelles colonnes)

Les notes Perplexity / enrichissement décrivent d’anciens chemins admin. Toute source externe passe par `llm_model_source_ids` (LLM Stats / Compar:IA) ou `ecologits_model_links` (EcoLogits), jamais par une colonne dénormalisée sur `compl_ai_models`.

- [PERPLEXITY_MODELS_IMPLEMENTATION.md](./PERPLEXITY_MODELS_IMPLEMENTATION.md)
- [ENRICHISSEMENT_MODELS_IMPLEMENTATION.md](./ENRICHISSEMENT_MODELS_IMPLEMENTATION.md)
