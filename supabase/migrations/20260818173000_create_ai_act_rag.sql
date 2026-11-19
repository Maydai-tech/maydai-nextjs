begin;

-- RAG juridique AI Act (pgvector) — distinct du File Search OpenAI et du moteur de qualification.
-- Prérequis OVH : l'extension pgvector doit être installée (superuser si absente).

create extension if not exists vector;

create table if not exists public.ai_act_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_id text not null,
  drive_file_id text not null,
  file_name text not null,
  source_url text not null,
  version_date date not null,
  document_type text not null,
  hash text not null,
  is_active boolean not null default true,
  supersedes_id uuid references public.ai_act_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_act_documents_hash_sha256 check (hash ~ '^[a-f0-9]{64}$'),
  constraint ai_act_documents_no_self_supersede check (supersedes_id is distinct from id)
);

create unique index if not exists ai_act_documents_hash_key
  on public.ai_act_documents (hash);

create unique index if not exists ai_act_documents_one_active_per_canonical
  on public.ai_act_documents (canonical_id)
  where is_active = true;

create index if not exists ai_act_documents_canonical_id_idx
  on public.ai_act_documents (canonical_id);

create index if not exists ai_act_documents_is_active_idx
  on public.ai_act_documents (is_active);

create table if not exists public.ai_act_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.ai_act_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) > 0),
  embedding vector(1024) not null,
  created_at timestamptz not null default now(),
  constraint ai_act_chunks_document_index_key unique (document_id, chunk_index)
);

create index if not exists ai_act_chunks_document_id_idx
  on public.ai_act_chunks (document_id);

create index if not exists ai_act_chunks_embedding_hnsw_idx
  on public.ai_act_chunks
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_ai_act_chunks(
  query_embedding vector(1024),
  match_count integer default 8,
  match_threshold double precision default 0.2
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_index integer,
  similarity double precision,
  canonical_id text,
  source_url text,
  version_date date,
  document_type text,
  file_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity,
    d.canonical_id,
    d.source_url,
    d.version_date,
    d.document_type,
    d.file_name
  from public.ai_act_chunks c
  inner join public.ai_act_documents d on d.id = c.document_id
  where d.is_active = true
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
  order by c.embedding <=> query_embedding
  limit greatest(coalesce(match_count, 8), 1);
$$;

alter table public.ai_act_documents enable row level security;
alter table public.ai_act_chunks enable row level security;

grant select, insert, update, delete on public.ai_act_documents to service_role;
grant select, insert, update, delete on public.ai_act_chunks to service_role;
grant execute on function public.match_ai_act_chunks(vector, integer, double precision) to service_role;
grant execute on function public.match_ai_act_chunks(vector, integer, double precision) to authenticated;

drop policy if exists ai_act_documents_service_all on public.ai_act_documents;
create policy ai_act_documents_service_all on public.ai_act_documents
  for all to service_role
  using (true)
  with check (true);

drop policy if exists ai_act_chunks_service_all on public.ai_act_chunks;
create policy ai_act_chunks_service_all on public.ai_act_chunks
  for all to service_role
  using (true)
  with check (true);

comment on table public.ai_act_documents is
  'Corpus RAG AI Act (N / N-1). is_active=true = version courante. Ne pas confondre avec dossier_documents (preuves client).';
comment on table public.ai_act_chunks is
  'Chunks et embeddings mistral-embed (1024) du corpus AI Act.';
comment on function public.match_ai_act_chunks(vector, integer, double precision) is
  'Recherche sémantique namespacée : chunks dont le document parent est is_active = true.';

notify pgrst, 'reload schema';
commit;
