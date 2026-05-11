-- Documents uploaded against a lead (stage-2 verification).
-- Storage bucket "lead-documents" holds the raw PDFs; the documents table
-- holds metadata + Claude-extracted fields.

create type document_type   as enum ('payslip', 'id_document', 'bank_statement');
create type document_status as enum ('uploaded', 'parsing', 'parsed', 'failed', 'confirmed');

create table documents (
  id                text primary key default ('doc_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  lead_id           text not null references leads(id) on delete cascade,
  doc_type          document_type not null,
  file_path         text not null,
  file_name         text not null,
  file_size         int,
  status            document_status not null default 'uploaded',
  extracted_fields  jsonb,
  parse_error       text,
  uploaded_at       timestamptz not null default now(),
  parsed_at         timestamptz,
  confirmed_at      timestamptz
);

create index documents_lead_id_idx on documents (lead_id, uploaded_at desc);

alter publication supabase_realtime add table documents;

alter table documents enable row level security;

-- Anon (browser realtime subscribers) get read-only. Writes happen via the
-- service role only — mirrors the policy pattern in 0001_init.sql.
create policy "read documents (anon)" on documents for select using (true);

-- Storage bucket — private, served exclusively via signed URLs from the server.
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;

-- Storage policies: service role only. Anon clients never touch the bucket
-- directly; the app downloads bytes server-side and returns signed URLs when
-- needed.
create policy "service role manages lead-documents"
  on storage.objects for all to service_role
  using (bucket_id = 'lead-documents')
  with check (bucket_id = 'lead-documents');
