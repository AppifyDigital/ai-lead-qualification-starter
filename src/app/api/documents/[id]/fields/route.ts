import { supabaseAdmin } from "@/lib/supabase/server";
import { validateFields } from "@/lib/documents";
import type { DocumentType } from "@/types";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;
  const sb = supabaseAdmin();

  const docRes = await sb
    .from("documents")
    .select("id, doc_type, status")
    .eq("id", docId)
    .maybeSingle();
  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }
  const doc = docRes.data as { id: string; doc_type: DocumentType; status: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const fieldsRaw = (body as { fields?: unknown }).fields;
  const result = validateFields(doc.doc_type, fieldsRaw);
  if (!result.ok) {
    return Response.json({ error: "invalid_fields", issues: result.issues }, { status: 400 });
  }

  const update = await sb
    .from("documents")
    .update({
      extracted_fields: result.fields,
      // If the doc had failed previously, surface that it's now usable.
      status: doc.status === "failed" ? "parsed" : doc.status,
      parse_error: null,
    })
    .eq("id", docId);
  if (update.error) {
    return Response.json(
      { error: "db_update_failed", detail: update.error.message },
      { status: 500 }
    );
  }

  return Response.json({ id: docId, fields: result.fields });
}
