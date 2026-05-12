import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
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
    .select("id, file_path, lead_id")
    .eq("id", docId)
    .maybeSingle();
  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }
  if (docRes.data.lead_id !== leadRes.data.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const storage = await sb.storage
    .from("lead-documents")
    .remove([docRes.data.file_path]);
  if (storage.error) {
    return Response.json(
      { error: "storage_delete_failed", detail: storage.error.message },
      { status: 500 }
    );
  }

  const del = await sb.from("documents").delete().eq("id", docId);
  if (del.error) {
    return Response.json(
      { error: "db_delete_failed", detail: del.error.message },
      { status: 500 }
    );
  }

  return Response.json({ id: docId, deleted: true });
}
