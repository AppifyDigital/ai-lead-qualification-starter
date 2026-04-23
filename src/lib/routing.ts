import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedCallData, Lead, TeamMember } from "@/types";

const MODEL = "claude-sonnet-4-5";

export type RoutingDecision = {
  assigneeId: string;
  reasoning: string;
};

const ROUTING_SYSTEM = `You assign an inbound loan lead to the best available team member.

Weigh three factors, in order:
  1. Language match — the rep must speak the lead's preferred language.
  2. Availability — prefer "available" over "on-call" over "away". Never pick "offline".
  3. Current load — prefer reps with fewer active leads when other factors tie.

Return JSON only — no prose, no markdown:

{ "assigneeId": "tm_xxx", "reasoning": "One sentence explaining the choice in plain language a manager would read." }

The reasoning will be shown to the user in the UI, so be specific: name the language, the availability, the load.`;

export async function pickAssignee(
  lead: Lead,
  extracted: ExtractedCallData | null,
  team: TeamMember[]
): Promise<RoutingDecision> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMsg = JSON.stringify(
    {
      lead: {
        name: lead.name,
        language: lead.language,
        amount: lead.amount,
        purpose: lead.purpose,
        score: lead.score,
      },
      callData: extracted,
      team: team.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        languages: m.languages,
        status: m.status,
        activeLeads: m.activeLeads,
      })),
    },
    null,
    2
  );

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: ROUTING_SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = JSON.parse(text) as RoutingDecision;

  if (!team.some((m) => m.id === parsed.assigneeId)) {
    throw new Error(`Claude picked unknown assigneeId: ${parsed.assigneeId}`);
  }

  return parsed;
}
