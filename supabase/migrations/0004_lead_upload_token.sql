-- Token-gated public upload page per lead.
-- Nullable: tokens are issued on demand by the admin (no backfill).

alter table leads
  add column upload_token text unique;

create index leads_upload_token_idx on leads (upload_token);
