import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createOutboundCall } from "@/lib/vapi";
import type { Lead } from "@/types";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  zip: z.string().min(3),
  amount: z.number().int().positive(),
  language: z.enum(["English", "Spanish", "Korean", "German", "Mandarin"]).default("English"),
  purpose: z.string().optional(),
});

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: inserted, error: insertErr } = await sb
    .from("leads")
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      zip: parsed.data.zip,
      amount: parsed.data.amount,
      language: parsed.data.language,
      purpose: parsed.data.purpose ?? null,
      stage: "New",
      is_new: true,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return Response.json({ error: "db_insert_failed", detail: insertErr?.message }, { status: 500 });
  }

  // Shape the lead for Vapi — same fields as the UI Lead type.
  const lead: Lead = {
    id: inserted.id,
    name: inserted.name,
    email: inserted.email,
    phone: inserted.phone,
    zip: inserted.zip,
    amount: inserted.amount,
    termMonths: inserted.term_months ?? 0,
    language: inserted.language,
    purpose: inserted.purpose ?? "",
    stage: inserted.stage,
    score: inserted.score,
    assigneeId: inserted.assignee_id,
    receivedAt: inserted.received_at,
  };

  try {
    const call = await createOutboundCall(lead);
    await sb.from("calls").insert({
      lead_id: lead.id,
      vapi_call_id: call.id,
      status: "queued",
    });
  } catch (err) {
    // Don't fail the lead insert if Vapi is misconfigured — the CRM can still
    // see the lead and a human can call them. Record the failure visibly.
    console.error("vapi createCall failed", err);
    await sb.from("calls").insert({
      lead_id: lead.id,
      status: "failed",
    });
  }

  return Response.json({ id: lead.id }, { status: 201 });
}
