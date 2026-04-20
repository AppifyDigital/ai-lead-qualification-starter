import { cache } from "react";
import leadsJson from "@/data/leads.json";
import teamJson from "@/data/team.json";
import transcriptsJson from "@/data/transcripts.json";
import type { Lead, LeadCall, TeamMember } from "@/types";

export const getLeads = cache(async (): Promise<Lead[]> => {
  return leadsJson as Lead[];
});

export const getLeadById = cache(
  async (id: string): Promise<Lead | null> => {
    const leads = await getLeads();
    return leads.find((l) => l.id === id) ?? null;
  }
);

export const getTeam = cache(async (): Promise<TeamMember[]> => {
  return teamJson as TeamMember[];
});

export const getMemberById = cache(
  async (id: string | null): Promise<TeamMember | null> => {
    if (!id) return null;
    const team = await getTeam();
    return team.find((m) => m.id === id) ?? null;
  }
);

export const getLeadCall = cache(
  async (leadId: string): Promise<LeadCall | null> => {
    const calls = transcriptsJson as Record<string, LeadCall>;
    return calls[leadId] ?? null;
  }
);
