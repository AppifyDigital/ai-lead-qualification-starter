import { supabaseAdmin } from "@/lib/supabase/server";
import { pickAssignee } from "@/lib/routing";
import type { Lead, TeamMember, ExtractedCallData } from "@/types";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseAdmin();

  const [leadRes, teamRes, callRes] = await Promise.all([
    sb.from("leads").select("*").eq("id", id).maybeSingle(),
    sb.from("team_members").select("*"),
    sb
      .from("calls")
      .select("extracted_data")
      .eq("lead_id", id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (leadRes.error || !leadRes.data) {
    return Response.json({ error: "lead_not_found" }, { status: 404 });
  }
  if (teamRes.error || !teamRes.data) {
    return Response.json({ error: "team_fetch_failed" }, { status: 500 });
  }

  const lead: Lead = {
    id: leadRes.data.id,
    name: leadRes.data.name,
    email: leadRes.data.email,
    phone: leadRes.data.phone,
    zip: leadRes.data.zip,
    amount: leadRes.data.amount,
    termMonths: leadRes.data.term_months ?? 0,
    language: leadRes.data.language,
    purpose: leadRes.data.purpose ?? "",
    stage: leadRes.data.stage,
    score: leadRes.data.score,
    assigneeId: leadRes.data.assignee_id,
    receivedAt: leadRes.data.received_at,
  };

  const team: TeamMember[] = teamRes.data.map((r) => ({
    id: r.id, name: r.name, initials: r.initials, role: r.role, email: r.email,
    languages: r.languages, activeLeads: r.active_leads, status: r.status,
  }));

  const extracted = (callRes.data?.extracted_data ?? null) as ExtractedCallData | null;

  const decision = await pickAssignee(lead, extracted, team);

  await sb.from("routing_decisions").insert({
    lead_id: lead.id,
    assignee_id: decision.assigneeId,
    reasoning: decision.reasoning,
  });

  await sb
    .from("leads")
    .update({ assignee_id: decision.assigneeId, is_new: false })
    .eq("id", lead.id);

  return Response.json(decision);
}
