import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;
  const sb = supabaseAdmin();

  const docRes = await sb
    .from("documents")
    .select("id, status")
    .eq("id", docId)
    .maybeSingle();

  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }
  if (docRes.data.status !== "parsed" && docRes.data.status !== "confirmed") {
    return Response.json({ error: "document_not_parsed" }, { status: 409 });
  }

  const update = await sb
    .from("documents")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", docId);

  if (update.error) {
    return Response.json(
      { error: "db_update_failed", detail: update.error.message },
      { status: 500 }
    );
  }

  return Response.json({ id: docId, status: "confirmed" });
}
