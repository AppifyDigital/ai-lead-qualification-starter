import { supabaseAdmin } from "@/lib/supabase/server";
import { validateFields } from "@/lib/documents";
import type { DocumentType } from "@/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; docId: string }> }
) {
  const { token, docId } = await params;
  const sb = supabaseAdmin();

  const leadRes = await sb
    .from("leads")
    .select("id")
    .eq("upload_token", token)
    .maybeSingle();
  if (leadRes.error || !leadRes.data) {
    return Response.json({ error: "invalid_token" }, { status: 404 });
  }

  const docRes = await sb
    .from("documents")
    .select("id, doc_type, status, lead_id")
    .eq("id", docId)
    .maybeSingle();
  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }
  if (docRes.data.lead_id !== leadRes.data.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const doc = docRes.data as {
    id: string;
    doc_type: DocumentType;
    status: string;
    lead_id: string;
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = validateFields(doc.doc_type, (body as { fields?: unknown }).fields);
  if (!result.ok) {
    return Response.json({ error: "invalid_fields", issues: result.issues }, { status: 400 });
  }

  const update = await sb
    .from("documents")
    .update({
      extracted_fields: result.fields,
      status: doc.status === "failed" ? "parsed" : doc.status,
      parse_error: null,
    })
    .eq("id", doc.id);
  if (update.error) {
    return Response.json(
      { error: "db_update_failed", detail: update.error.message },
      { status: 500 }
    );
  }

  return Response.json({ id: doc.id, fields: result.fields });
}
