import { supabaseAdmin } from "@/lib/supabase/server";
import { analyzeCall } from "@/lib/claude";
import type { TranscriptLine } from "@/types";

export const runtime = "nodejs";

// Vapi wraps the event under `message`. We pull the bits we need defensively —
// the field names shift slightly across Vapi versions, so we fall back instead
// of hard-failing.
type VapiPayload = {
  message?: {
    type: string;
    call?: { id?: string; startedAt?: string; endedAt?: string };
    durationSeconds?: number;
    transcript?: string;
    artifact?: {
      messages?: Array<{ role?: string; message?: string; secondsFromStart?: number; time?: number }>;
    };
    messages?: Array<{ role?: string; message?: string; secondsFromStart?: number; time?: number }>;
  };
};

function getCallId(p: VapiPayload): string | undefined {
  return p.message?.call?.id;
}

function normalizeTranscript(p: VapiPayload): TranscriptLine[] {
  const msgs = p.message?.artifact?.messages ?? p.message?.messages ?? [];
  return msgs
    .filter((m) => m.role === "assistant" || m.role === "user")
    .map((m, i) => ({
      t: Number(m.secondsFromStart ?? m.time ?? i * 3),
      who: m.role === "assistant" ? "agent" : "user",
      text: m.message ?? "",
    }));
}

export async function POST(request: Request) {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("x-vapi-signature");
    if (signature !== secret) {
      return new Response("unauthorized", { status: 401 });
    }
  }

  const payload = (await request.json()) as VapiPayload;
  const type = payload.message?.type;
  const vapiCallId = getCallId(payload);

  if (!vapiCallId) {
    return Response.json({ ok: true, skipped: "no_call_id" });
  }

  const sb = supabaseAdmin();

  if (type === "call-started" || type === "status-update") {
    await sb
      .from("calls")
      .update({ status: "in-progress", started_at: payload.message?.call?.startedAt ?? new Date().toISOString() })
      .eq("vapi_call_id", vapiCallId);
    return Response.json({ ok: true });
  }

  if (type === "call-ended" || type === "hang") {
    await sb
      .from("calls")
      .update({
        status: "completed",
        ended_at: payload.message?.call?.endedAt ?? new Date().toISOString(),
        duration_sec: payload.message?.durationSeconds
          ? Math.round(payload.message.durationSeconds)
          : null,
      })
      .eq("vapi_call_id", vapiCallId);
    return Response.json({ ok: true });
  }

  if (type === "end-of-call-report") {
    // Look up the call + owning lead.
    const { data: callRow } = await sb
      .from("calls")
      .select("id, lead_id")
      .eq("vapi_call_id", vapiCallId)
      .maybeSingle();

    if (!callRow) {
      return Response.json({ ok: true, skipped: "call_not_found" });
    }

    const transcript = normalizeTranscript(payload);
    const duration_sec = payload.message?.durationSeconds
      ? Math.round(payload.message.durationSeconds)
      : null;

    // Save the transcript first so a Claude/JSON parse failure below still leaves
    // a visible trail in the CRM instead of stranding the row at `in-progress`.
    await sb
      .from("calls")
      .update({ status: "completed", transcript, duration_sec })
      .eq("id", callRow.id);

    let analysis: Awaited<ReturnType<typeof analyzeCall>> | null = null;
    try {
      analysis = await analyzeCall(transcript);
    } catch (err) {
      console.error("analyzeCall failed; transcript saved, skipping enrichment", err);
    }

    if (analysis) {
      const qualifiedScore = Math.max(0, Math.min(100, analysis.extracted.qualificationScore * 10));

      await sb
        .from("calls")
        .update({
          summary: analysis.summary,
          summary_tail: analysis.summaryTail,
          estimated_income: analysis.extracted.estimatedIncome,
          extracted_data: analysis.extracted,
        })
        .eq("id", callRow.id);

      await sb
        .from("leads")
        .update({
          stage: "Qualified",
          score: qualifiedScore,
          term_months: analysis.extracted.repaymentPeriodMonths,
          purpose: analysis.extracted.loanPurpose,
        })
        .eq("id", callRow.lead_id);
    }

    // Kick off routing — do not await if it's slow; we still want to ack
    // the webhook quickly. But the demo is more legible if we await inline.
    try {
      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      await fetch(`${appUrl}/api/leads/${callRow.lead_id}/assign`, { method: "POST" });
    } catch (err) {
      console.error("auto-assign trigger failed", err);
    }

    return Response.json({ ok: true });
  }

  return Response.json({ ok: true, ignored: type });
}
