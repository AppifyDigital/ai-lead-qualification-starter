import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;
  const sb = supabaseAdmin();

  const docRes = await sb
    .from("documents")
    .select("id, file_path")
    .eq("id", docId)
    .maybeSingle();

  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }

  // Delete the storage object first. If it fails, leave the row in place so
  // the user can retry instead of being left with an orphaned object.
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
