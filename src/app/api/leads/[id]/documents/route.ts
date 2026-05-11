import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const DocType = z.enum(["payslip", "id_document", "bank_statement"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const sb = supabaseAdmin();

  const lead = await sb.from("leads").select("id").eq("id", leadId).maybeSingle();
  if (lead.error || !lead.data) {
    return Response.json({ error: "lead_not_found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const docTypeRaw = form.get("doc_type");
  const docTypeParsed = DocType.safeParse(docTypeRaw);
  if (!docTypeParsed.success) {
    return Response.json({ error: "invalid_doc_type" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file_missing" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "file_not_pdf" }, { status: 415 });
  }
  if (file.size === 0) {
    return Response.json({ error: "file_empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "file_too_large", maxBytes: MAX_FILE_SIZE }, { status: 413 });
  }

  const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const filePath = `${leadId}/${docId}.pdf`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await sb.storage.from("lead-documents").upload(filePath, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    return Response.json(
      { error: "storage_upload_failed", detail: upload.error.message },
      { status: 500 }
    );
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
    // Roll the upload back so we don't leave an orphaned object.
    await sb.storage.from("lead-documents").remove([filePath]);
    return Response.json(
      { error: "db_insert_failed", detail: insert.error?.message },
      { status: 500 }
    );
  }

  // Kick off parsing without blocking the response. Each Next.js invocation
  // gets its own runtime, so this fetch is safe to fire-and-forget.
  const parseUrl = new URL(`/api/documents/${docId}/parse`, request.url);
  fetch(parseUrl, { method: "POST" }).catch((err) => {
    console.error("parse trigger failed", err);
  });

  return Response.json({ id: docId }, { status: 201 });
}
