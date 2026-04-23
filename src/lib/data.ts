import "server-only";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type {
  Lead,
  LeadCall,
  TeamMember,
  RoutingDecision,
  TranscriptLine,
  ExtractedCallData,
} from "@/types";

// Row shapes returned by the Supabase queries below. Kept narrow so a schema
// drift surfaces as a TS error rather than silently reshaping the UI.
type LeadRow = {
  id: string; name: string; email: string; phone: string; zip: string;
  amount: number; term_months: number | null; language: Lead["language"];
  purpose: string | null; stage: Lead["stage"]; score: number;
  assignee_id: string | null; received_at: string; is_new: boolean;
};

type CallRow = {
  lead_id: string; duration_sec: number | null; language: Lead["language"] | null;
  summary: string | null; summary_tail: string | null; estimated_income: string | null;
  transcript: TranscriptLine[] | null; extracted_data: ExtractedCallData | null;
};

type TeamRow = {
  id: string; name: string; initials: string; role: string; email: string;
  languages: Lead["language"][]; active_leads: number; status: TeamMember["status"];
};

const toLead = (r: LeadRow): Lead => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, zip: r.zip,
  amount: r.amount, termMonths: r.term_months ?? 0, language: r.language,
  purpose: r.purpose ?? "", stage: r.stage, score: r.score,
  assigneeId: r.assignee_id, receivedAt: r.received_at, isNew: r.is_new,
});

const toTeamMember = (r: TeamRow): TeamMember => ({
  id: r.id, name: r.name, initials: r.initials, role: r.role, email: r.email,
  languages: r.languages, activeLeads: r.active_leads, status: r.status,
});

export const getLeads = cache(async (): Promise<Lead[]> => {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .order("received_at", { ascending: false });
  if (error) throw error;
  return (data as LeadRow[]).map(toLead);
});

export const getLeadById = cache(async (id: string): Promise<Lead | null> => {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toLead(data as LeadRow) : null;
});

export const getTeam = cache(async (): Promise<TeamMember[]> => {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("team_members").select("*").order("name");
  if (error) throw error;
  return (data as TeamRow[]).map(toTeamMember);
});

export const getMemberById = cache(async (id: string | null): Promise<TeamMember | null> => {
  if (!id) return null;
  const sb = await supabaseServer();
  const { data, error } = await sb.from("team_members").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toTeamMember(data as TeamRow) : null;
});

export const getLeadCall = cache(async (leadId: string): Promise<LeadCall | null> => {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("calls")
    .select("lead_id, duration_sec, language, summary, summary_tail, estimated_income, transcript, extracted_data")
    .eq("lead_id", leadId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const r = data as CallRow;
  return {
    leadId: r.lead_id,
    durationSec: r.duration_sec ?? 0,
    language: r.language ?? "English",
    summary: r.summary ?? "",
    summaryTail: r.summary_tail ?? "",
    estimatedIncome: r.estimated_income ?? "",
    transcript: r.transcript ?? [],
    extracted: r.extracted_data,
  };
});

export const getLatestRouting = cache(async (leadId: string): Promise<RoutingDecision | null> => {
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("routing_decisions")
    .select("lead_id, assignee_id, reasoning, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    leadId: data.lead_id,
    assigneeId: data.assignee_id,
    reasoning: data.reasoning,
    createdAt: data.created_at,
  };
});
