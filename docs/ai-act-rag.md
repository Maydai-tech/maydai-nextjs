# RAG AI Act — ingestion Drive → pgvector

Corpus juridique pour un futur chat exploratoire. **Ce n’est pas** le File Search OpenAI des rapports, **ni** le moteur de qualification (`lib/qualification-v3-decision`).

Règle Cursor : `.cursor/rules/ai_act_rag.mdc`. État vérifié dans le code : l’ingestion est active ; **aucune** route applicative n’appelle encore `match_ai_act_chunks`.

## 1. Déclenchement

`POST /api/webhooks/kb-update` avec `x-api-key: $INTERNAL_API_KEY`.

Si `folder_name === "05_AI_Act_Docs"` (`isAiActDocsFolder`) → `ingestAiActKnowledgeBase()`. Le `file_name` du payload est ignoré : l’index Drive fait foi.

`maxDuration` de la route : 300 s (OCR + embeddings).

```http
POST /api/webhooks/kb-update
x-api-key: <INTERNAL_API_KEY>
Content-Type: application/json

{
  "event": "kb_file_updated",
  "source": "hermes",
  "folder_name": "05_AI_Act_Docs",
  "subfolder_name": "",
  "file_name": "AI_Act_Index.json"
}
```

Réponse : `{ success, source: "ai_act_rag", documents_processed, documents_ingested, documents_skipped, chunks_created, errors[] }`.  
500 seulement si erreurs **et** `documents_ingested === 0`.

## 2. Index Drive

Fichier `AI_Act_Index.json` à la racine du dossier (constantes `AI_ACT_DOCS_FOLDER` / `AI_ACT_INDEX_FILE_NAME`).

Chaque entrée (Zod) :

| Champ | Contrainte |
|-------|------------|
| `canonical_id` | string non vide |
| `drive_file_id` | id Drive |
| `file_name` | nom fichier |
| `source_url` | URL |
| `version_date` | `YYYY-MM-DD` |
| `document_type` | string |
| `hash` | SHA-256 hex 64 |
| `status` | `active` \| `archived` |

Seules les lignes `active` sont ingérées. Un `canonical_id` actif en double dans l’index fait échouer le parse.

## 3. Base

Migration `supabase/migrations/20260818173000_create_ai_act_rag.sql` :

- `ai_act_documents` : métadonnées + `is_active` + `supersedes_id` + `hash` unique.
- Un seul `is_active = true` par `canonical_id` (index unique partiel).
- `ai_act_chunks` : texte + `embedding vector(1024)` (`mistral-embed`).
- RPC **`match_ai_act_chunks`** (jamais `match_documents`) : jointure, chunks dont le parent est actif.

Versioning N / N-1 : l’ancien document passe `is_active = false`, le nouveau pointe `supersedes_id`. Les chunks N-1 restent en base mais sortent de la RPC.

## 4. Pipeline

`lib/rag-ingestion.ts` + `lib/ai-act-mistral.ts` :

1. Lire l’index via Google Drive (`lib/google-drive.ts`).
2. Télécharger chaque fichier actif.
3. Extraire le texte (OCR / parse Mistral selon le type).
4. Chunking sémantique (~1000 tokens, overlap ~200 ; heuristique 4 caractères ≈ 1 token).
5. Embeddings `mistral-embed` (1024 dims), insertion `ai_act_documents` puis `ai_act_chunks`.

Hash déjà présent → skip. Même `canonical_id` avec nouveau hash → rotation N / N-1.

## 5. Variables

`MISTRAL_API_KEY`, `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY` (`\n` littéraux), `GOOGLE_DRIVE_SHARED_ROOT_ID`, `INTERNAL_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 6. Pièges

- Tester le webhook Compar:IA avec `test-webhook.sh` **ne** déclenche **pas** le RAG (`folder_name` Bench_LLM). Pour le RAG, envoyer `folder_name: "05_AI_Act_Docs"`.
- Ne pas brancher ce corpus sur le File Search OpenAI ni sur `qualification-v3-decision`.
- Consommation chat : à implémenter via `match_ai_act_chunks` uniquement. Ne pas inventer une RPC générique.
- Clé privée Drive : garder les `\n` échappés dans `.env` (remplacés au runtime dans `lib/google-drive.ts`).
