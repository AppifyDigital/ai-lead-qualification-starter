import { supabaseAdmin } from "@/lib/supabase/server";
import { processUpload } from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const sb = supabaseAdmin();

  const leadRes = await sb
    .from("leads")
    .select("id")
    .eq("upload_token", token)
    .maybeSingle();

  if (leadRes.error || !leadRes.data) {
    return Response.json({ error: "invalid_token" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const result = await processUpload(sb, leadRes.data.id, form, request.url);
  if (!result.ok) {
    return Response.json(result.body, { status: result.status });
  }

  return Response.json({ id: result.docId }, { status: 201 });
}
