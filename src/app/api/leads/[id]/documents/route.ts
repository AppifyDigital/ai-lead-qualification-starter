import { supabaseAdmin } from "@/lib/supabase/server";
import { processUpload } from "@/lib/documents";

export const runtime = "nodejs";

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

  const result = await processUpload(sb, leadId, form, request.url);
  if (!result.ok) {
    return Response.json(result.body, { status: result.status });
  }

  return Response.json({ id: result.docId }, { status: 201 });
}
