import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BankStatementFields,
  DocumentType,
  ExtractedDocumentFields,
  IdDocumentFields,
  PayslipFields,
} from "@/types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const DocTypeEnum = z.enum(["payslip", "id_document", "bank_statement"]);

export type UploadResult =
  | { ok: true; docId: string }
  | { ok: false; status: number; body: Record<string, unknown> };

// Shared upload pipeline: validate form, upload to Storage, insert row, fire
// parse trigger. Used by both the admin and lead-facing upload routes so the
// behavior stays identical.
export async function processUpload(
  sb: SupabaseClient,
  leadId: string,
  form: FormData,
  requestUrl: string,
): Promise<UploadResult> {
  const docTypeParsed = DocTypeEnum.safeParse(form.get("doc_type"));
  if (!docTypeParsed.success) {
    return { ok: false, status: 400, body: { error: "invalid_doc_type" } };
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, body: { error: "file_missing" } };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, status: 415, body: { error: "file_not_pdf" } };
  }
  if (file.size === 0) {
    return { ok: false, status: 400, body: { error: "file_empty" } };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      body: { error: "file_too_large", maxBytes: MAX_UPLOAD_BYTES },
    };
  }

  const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const filePath = `${leadId}/${docId}.pdf`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await sb.storage.from("lead-documents").upload(filePath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    return {
      ok: false,
      status: 500,
      body: { error: "storage_upload_failed", detail: upload.error.message },
    };
  }

  const insert = await sb
    .from("documents")
    .insert({
      id: docId,
      lead_id: leadId,
      doc_type: docTypeParsed.data,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (insert.error || !insert.data) {
    await sb.storage.from("lead-documents").remove([filePath]);
    return {
      ok: false,
      status: 500,
      body: { error: "db_insert_failed", detail: insert.error?.message },
    };
  }

  // Fire-and-forget parse trigger. Each Next.js invocation has its own
  // runtime, so this fetch survives the response of the upload request.
  const parseUrl = new URL(`/api/documents/${docId}/parse`, requestUrl);
  fetch(parseUrl, { method: "POST" }).catch((err) => {
    console.error("parse trigger failed", err);
  });

  return { ok: true, docId };
}

// Shape of one editable field in the UI. Drives input type + validation.
export type FieldKind = "string" | "number" | "date";
export type FieldSchema = { key: string; label: string; kind: FieldKind };

export const FIELD_SCHEMAS: Record<DocumentType, FieldSchema[]> = {
  payslip: [
    { key: "employer",        label: "Employer",        kind: "string" },
    { key: "grossMonthly",    label: "Gross / mo",      kind: "number" },
    { key: "netMonthly",      label: "Net / mo",        kind: "number" },
    { key: "payPeriodStart",  label: "Period start",    kind: "date"   },
    { key: "payPeriodEnd",    label: "Period end",      kind: "date"   },
    { key: "employmentType",  label: "Employment",      kind: "string" },
    { key: "currency",        label: "Currency",        kind: "string" },
  ],
  id_document: [
    { key: "fullName",        label: "Full name",       kind: "string" },
    { key: "dateOfBirth",     label: "Date of birth",   kind: "date"   },
    { key: "idDocumentType",  label: "Doc kind",        kind: "string" },
    { key: "documentNumber",  label: "Doc number",      kind: "string" },
    { key: "expiryDate",      label: "Expires",         kind: "date"   },
    { key: "nationality",     label: "Nationality",     kind: "string" },
  ],
  bank_statement: [
    { key: "accountHolder",   label: "Account holder",  kind: "string" },
    { key: "bankName",        label: "Bank",            kind: "string" },
    { key: "periodStart",     label: "Period start",    kind: "date"   },
    { key: "periodEnd",       label: "Period end",      kind: "date"   },
    { key: "averageBalance",  label: "Avg balance",     kind: "number" },
    { key: "totalInflows",    label: "Inflows",         kind: "number" },
    { key: "totalOutflows",   label: "Outflows",        kind: "number" },
    { key: "currency",        label: "Currency",        kind: "string" },
  ],
};

const PayslipSchema = z.object({
  employer:        z.string().nullable(),
  grossMonthly:    z.number().nullable(),
  netMonthly:      z.number().nullable(),
  payPeriodStart:  z.string().nullable(),
  payPeriodEnd:    z.string().nullable(),
  employmentType:  z.string().nullable(),
  currency:        z.string().nullable(),
});

const IdDocSchema = z.object({
  fullName:        z.string().nullable(),
  dateOfBirth:     z.string().nullable(),
  idDocumentType:  z.string().nullable(),
  documentNumber:  z.string().nullable(),
  expiryDate:      z.string().nullable(),
  nationality:     z.string().nullable(),
});

const BankStatementSchema = z.object({
  accountHolder:   z.string().nullable(),
  bankName:        z.string().nullable(),
  periodStart:     z.string().nullable(),
  periodEnd:       z.string().nullable(),
  averageBalance:  z.number().nullable(),
  totalInflows:    z.number().nullable(),
  totalOutflows:   z.number().nullable(),
  currency:        z.string().nullable(),
});

export function validateFields(
  docType: DocumentType,
  raw: unknown,
): { ok: true; fields: ExtractedDocumentFields } | { ok: false; issues: z.ZodIssue[] } {
  const schema =
    docType === "payslip" ? PayslipSchema :
    docType === "id_document" ? IdDocSchema :
    BankStatementSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  return {
    ok: true,
    fields: parsed.data as PayslipFields | IdDocumentFields | BankStatementFields,
  };
}
