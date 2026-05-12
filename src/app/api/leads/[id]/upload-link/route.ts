import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const sb = supabaseAdmin();

  const leadRes = await sb
    .from("leads")
    .select("id, upload_token")
    .eq("id", leadId)
    .maybeSingle();

  if (leadRes.error || !leadRes.data) {
    return Response.json({ error: "lead_not_found" }, { status: 404 });
  }

  let token = leadRes.data.upload_token as string | null;
  if (!token) {
    token = generateToken();
    const update = await sb
      .from("leads")
      .update({ upload_token: token })
      .eq("id", leadId);
    if (update.error) {
      return Response.json(
        { error: "db_update_failed", detail: update.error.message },
        { status: 500 }
      );
    }
  }

  const origin = new URL(request.url).origin;
  return Response.json({ token, url: `${origin}/upload/${token}` });
}
