import { supabaseAdmin } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/claude";
import type { DocumentType } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: docId } = await params;
  const sb = supabaseAdmin();

  const docRes = await sb
    .from("documents")
    .select("id, doc_type, file_path, status")
    .eq("id", docId)
    .maybeSingle();

  if (docRes.error || !docRes.data) {
    return Response.json({ error: "document_not_found" }, { status: 404 });
  }
  const doc = docRes.data as {
    id: string;
    doc_type: DocumentType;
    file_path: string;
    status: string;
  };

  await sb
    .from("documents")
    .update({ status: "parsing", parse_error: null })
    .eq("id", doc.id);

  try {
    const download = await sb.storage.from("lead-documents").download(doc.file_path);
    if (download.error || !download.data) {
      throw new Error(download.error?.message ?? "storage_download_failed");
    }
    const buf = Buffer.from(await download.data.arrayBuffer());
    const pdfBase64 = buf.toString("base64");

    const fields = await parseDocument(doc.doc_type, pdfBase64);

    const update = await sb
      .from("documents")
      .update({
        status: "parsed",
        extracted_fields: fields,
        parsed_at: new Date().toISOString(),
        parse_error: null,
      })
      .eq("id", doc.id);
    if (update.error) {
      throw new Error(update.error.message);
    }

    return Response.json({ id: doc.id, status: "parsed", fields });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from("documents")
      .update({ status: "failed", parse_error: message })
      .eq("id", doc.id);
    return Response.json({ error: "parse_failed", detail: message }, { status: 500 });
  }
}
