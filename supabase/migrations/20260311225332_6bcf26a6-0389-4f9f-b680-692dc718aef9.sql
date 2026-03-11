
-- Enable pgvector in public schema
create extension if not exists vector with schema public;

-- RAG DOCUMENTS
create table public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  namespace text not null,
  source_type text not null,
  source_id uuid,
  title text,
  summary text,
  language text not null default 'fr',
  visibility_scope text not null default 'private',
  user_id uuid,
  property_id uuid,
  project_id uuid,
  contractor_id uuid,
  city text,
  tags jsonb default '[]'::jsonb,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RAG CHUNKS
create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(768),
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- CONVERSATION MEMORY
create table public.conversation_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid,
  session_id uuid,
  memory_type text not null default 'context',
  memory_text text not null,
  importance_score int default 5,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- RAG QUERIES LOG
create table public.rag_queries_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  query_text text not null,
  namespace_filter text[],
  top_k int default 5,
  results_json jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- INDEXES
create index idx_rag_documents_namespace on public.rag_documents(namespace);
create index idx_rag_documents_user_id on public.rag_documents(user_id);
create index idx_rag_documents_property_id on public.rag_documents(property_id);
create index idx_rag_documents_project_id on public.rag_documents(project_id);
create index idx_rag_documents_contractor_id on public.rag_documents(contractor_id);
create index idx_rag_documents_visibility on public.rag_documents(visibility_scope);
create index idx_rag_chunks_document_id on public.rag_chunks(document_id);
create index idx_conversation_memory_user_id on public.conversation_memory(user_id);
create index idx_conversation_memory_session_id on public.conversation_memory(session_id);

-- RLS
alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;
alter table public.conversation_memory enable row level security;
alter table public.rag_queries_log enable row level security;

-- RAG Documents policies
create policy "Anyone can read public rag documents" on public.rag_documents for select to public using (visibility_scope = 'public');
create policy "Users can read own private rag documents" on public.rag_documents for select to authenticated using (user_id = auth.uid());
create policy "Admins can manage all rag documents" on public.rag_documents for all to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Service role manages rag documents" on public.rag_documents for all to service_role using (true);

-- RAG Chunks policies
create policy "Anyone can read chunks of public documents" on public.rag_chunks for select to public using (exists (select 1 from public.rag_documents d where d.id = rag_chunks.document_id and d.visibility_scope = 'public'));
create policy "Users can read chunks of own documents" on public.rag_chunks for select to authenticated using (exists (select 1 from public.rag_documents d where d.id = rag_chunks.document_id and d.user_id = auth.uid()));
create policy "Admins can manage all rag chunks" on public.rag_chunks for all to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Service role manages rag chunks" on public.rag_chunks for all to service_role using (true);

-- Conversation Memory policies
create policy "Users can manage own conversation memory" on public.conversation_memory for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins can view all conversation memory" on public.conversation_memory for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Service role manages conversation memory" on public.conversation_memory for all to service_role using (true);

-- RAG Queries Log policies
create policy "Users can view own query logs" on public.rag_queries_log for select to authenticated using (user_id = auth.uid());
create policy "Service role manages query logs" on public.rag_queries_log for all to service_role using (true);

-- VECTOR SEARCH FUNCTION
create or replace function public.match_rag_chunks(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_namespaces text[] default null,
  filter_user_id uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_content text,
  chunk_index int,
  namespace text,
  document_title text,
  document_summary text,
  similarity float
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    c.id,
    d.id,
    c.content,
    c.chunk_index,
    d.namespace,
    d.title,
    d.summary,
    (1 - (c.embedding <=> query_embedding))::float
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where
    c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) > match_threshold
    and (filter_namespaces is null or d.namespace = any(filter_namespaces))
    and (d.visibility_scope = 'public' or (filter_user_id is not null and d.user_id = filter_user_id))
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- FULL-TEXT SEARCH FUNCTION (MVP primary)
create or replace function public.search_rag_chunks_text(
  search_query text,
  match_count int default 5,
  filter_namespaces text[] default null,
  filter_user_id uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  chunk_content text,
  chunk_index int,
  namespace text,
  document_title text,
  document_summary text,
  rank real
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    c.id,
    d.id,
    c.content,
    c.chunk_index,
    d.namespace,
    d.title,
    d.summary,
    ts_rank(to_tsvector('french', coalesce(c.content, '')), plainto_tsquery('french', search_query))
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where
    to_tsvector('french', coalesce(c.content, '')) @@ plainto_tsquery('french', search_query)
    and (filter_namespaces is null or d.namespace = any(filter_namespaces))
    and (d.visibility_scope = 'public' or (filter_user_id is not null and d.user_id = filter_user_id))
  order by ts_rank(to_tsvector('french', coalesce(c.content, '')), plainto_tsquery('french', search_query)) desc
  limit match_count;
end;
$$;
