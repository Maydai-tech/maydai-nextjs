# RAG AI Act — veille JSON Drive → pgvector

Corpus juridique pour un futur chat exploratoire. **Ce n’est pas** le File Search OpenAI des rapports, **ni** le moteur de qualification (`lib/qualification-v3-decision`).

Règles Cursor : `.cursor/rules/ai_act_rag.mdc`, `.cursor/rules/hermes-drive-sync.mdc`.

État vérifié dans le code (septembre 2026) : l’ingestion **veille JSON** est active sur `POST /api/webhooks/kb-update`. **Aucune** route applicative n’appelle `match_ai_act_chunks`.

## 1. Déclenchement

`POST /api/webhooks/kb-update` avec `x-api-key: $INTERNAL_API_KEY`.

La branche RAG s’ouvre si **l’un** des deux est vrai (`isAiActVeilleRequest`) :

- `folder_name` (trim) === `05_AI_Act_Docs` (`isAiActDocsFolder` dans `lib/rag-ingestion.ts`)
- **ou** `file_name` (trim) === `AI_Act_Index.json`

Dans les deux cas, le webhook **relit toujours** `AI_Act_Index.json` via `findFileIdByName` — le `file_name` du payload ne sert qu’au routage, pas au téléchargement.

`maxDuration` de la route : 300 s. `dynamic = 'force-dynamic'`.

```http
POST /api/webhooks/kb-update
x-api-key: <INTERNAL_API_KEY>
Content-Type: application/json

{
  "event": "file_updated",
  "source": "hermes",
  "folder_name": "05_AI_Act_Docs",
  "subfolder_name": "regulations",
  "file_name": "AI_Act_Index.json"
}
```

Réponse (`AiActVeilleIngestionResult`) :

```json
{
  "success": true,
  "source": "ai_act_rag",
  "documents_processed": 3,
  "documents_inserted": 2,
  "documents_skipped": 1,
  "chunks_created": 2,
  "errors": []
}
```

- `success` = aucune erreur **ou** au moins un document inséré.
- HTTP **500** seulement si `errors.length > 0` **et** `documents_inserted === 0`.
- `INTERNAL_API_KEY` absent → 500 (`Configuration serveur incomplète`). Clé invalide → 401.

L’autre branche du même webhook (hors dossier AI Act / hors `AI_Act_Index.json`) importe un CSV Compar:IA via `persistCompariaCatalog`. Voir [llm-models-hub.md](./llm-models-hub.md).

## 2. Index Drive (chemin live)

Fichier `AI_Act_Index.json`, résolu par nom dans le Shared Drive (`GOOGLE_DRIVE_SHARED_ROOT_ID`, fallback `GOOGLE_DRIVE_KB_FOLDER_ID`).

Schéma Zod **réel** (objet racine, pas un tableau) :

```json
{
  "documents": [
    {
      "canonical_id": "art-6-annexe-iii",
      "file_name": "article-6.md",
      "source_url": "https://eur-lex.europa.eu/eli/reg/2024/1689",
      "version_date": "2024-08-01",
      "document_type": "regulation",
      "content": "Texte déjà extrait, prêt à embedder."
    }
  ]
}
```

| Champ | Contrainte |
|-------|------------|
| `canonical_id` | string non vide |
| `file_name` | string non vide |
| `source_url` | string non vide |
| `version_date` | `YYYY-MM-DD` |
| `document_type` | string non vide |
| `content` | texte non vide (déjà dans le JSON) |

Pas de `status`, pas de `hash`, pas de `drive_file_id` dans l’index. **Tous** les documents du tableau sont traités. Tableau vide → erreur (`Aucun document dans AI_Act_Index.json`). JSON invalide → 500.

## 3. Pipeline live (`route.ts`)

Implémentation **inline** dans `app/api/webhooks/kb-update/route.ts` — **ne pas** rappeler `ingestAiActKnowledgeBase`.

1. Télécharger `AI_Act_Index.json` (`getFileFromDrive`).
2. Valider `{ documents: [...] }` avec Zod.
3. Pour chaque document :
   - `hash` = SHA-256 UTF-8 de `content`.
   - Hash déjà en base → skip (`documents_skipped`).
   - Sinon : désactiver le N-1 actif du même `canonical_id`, insérer `ai_act_documents` (`drive_file_id` fixé à `'veille-json-source'`), embedder `content` via `POST https://api.mistral.ai/v1/embeddings` (`mistral-embed`, 1024 dims), insérer **un** chunk (`chunk_index = 0`).
4. Échec embed / chunk : supprimer le nouveau document et réactiver le N-1. L’erreur est collectée (`canonical_id: message`) ; les autres documents continuent.

Pas d’OCR, pas de téléchargement PDF, pas de chunking sémantique sur ce chemin.

## 4. Base

Migration `supabase/migrations/20260818173000_create_ai_act_rag.sql` :

- `ai_act_documents` : métadonnées + `is_active` + `supersedes_id` + `hash` unique (SHA-256 hex 64).
- Un seul `is_active = true` par `canonical_id` (index unique partiel).
- `ai_act_chunks` : texte + `embedding vector(1024)`.
- RPC **`match_ai_act_chunks`** (jamais `match_documents`) : jointure, chunks dont le parent est actif. Accordée à `service_role` et `authenticated`. RLS : écriture `service_role` uniquement.

Versioning N / N-1 : l’ancien passe `is_active = false`, le nouveau pointe `supersedes_id`. Les chunks N-1 restent en base mais sortent de la RPC.

## 5. Bibliothèque historique (non branchée)

`lib/rag-ingestion.ts` + `lib/ai-act-mistral.ts` implémentent un **autre** schéma d’index (tableau d’entrées avec `drive_file_id`, `hash`, `status: active|archived`) : téléchargement binaire, extraction texte, chunking ~1000 / overlap ~200 tokens, embeddings via `embedAiActTexts`.

`ingestAiActKnowledgeBase` n’est appelé **nulle part** hors de `lib/__tests__/rag-ingestion.test.ts`. Le webhook n’importe de ce module que `isAiActDocsFolder`. Ne pas « réparer » la route en rebranchant cette lib sans changer l’index Drive.

## 6. Variables

| Variable | Rôle |
|----------|------|
| `INTERNAL_API_KEY` | Header `x-api-key` du webhook |
| `MISTRAL_API_KEY` | Embeddings `mistral-embed` |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | Service account Drive |
| `GOOGLE_DRIVE_PRIVATE_KEY` | PEM avec `\n` littéraux (remplacés au runtime) |
| `GOOGLE_DRIVE_SHARED_ROOT_ID` | Shared Drive (fallback `GOOGLE_DRIVE_KB_FOLDER_ID`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client service |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS à l’insert |

## 7. Pièges

- `test-webhook.sh` cible le chemin Compar:IA / Bench LLM, **pas** le RAG. Pour le RAG, envoyer `folder_name: "05_AI_Act_Docs"` ou `file_name: "AI_Act_Index.json"`.
- Ne pas brancher ce corpus sur le File Search OpenAI ni sur `qualification-v3-decision`.
- Consommation chat : à implémenter via `match_ai_act_chunks` uniquement. Les cartes « Pédagogie AI Act » / « Support » de `/chat` sont encore des placeholders.
- `'veille-json-source'` n’est **pas** un id Drive : c’est un marqueur de provenance pour satisfaire `drive_file_id NOT NULL`.
- Clé privée Drive : garder les `\n` échappés dans `.env` (`lib/google-drive.ts`).
- Un document déjà vu (même hash) est ignoré même si `canonical_id` / métadonnées ont changé.
