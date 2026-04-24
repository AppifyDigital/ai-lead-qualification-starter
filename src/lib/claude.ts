import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedCallData, TranscriptLine } from "@/types";

const MODEL = "claude-sonnet-4-6";

const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CallAnalysis = {
  summary: string;                       // 2-3 sentences
  summaryTail: string;                   // follow-up context sentence the UI shows under the summary
  extracted: ExtractedCallData;
};

const ANALYSIS_SYSTEM = `You analyze a phone call transcript between an AI voice agent (Ada) and a loan applicant.

Return JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "summary": "2-3 sentences on what the caller wants and the key financial details (amount, term, purpose, income).",
  "summaryTail": "1 sentence on tone, urgency, or the recommended next step — shown as secondary text.",
  "extracted": {
    "confirmedAmount": number|null,
    "repaymentPeriodMonths": number|null,
    "employmentStatus": string|null,
    "loanPurpose": string|null,
    "qualificationScore": number,            // integer 1-10 overall lead quality
    "recommendedNextAction": string,         // short imperative, e.g. "Route to Spanish-speaking rep"
    "estimatedIncome": string|null           // formatted like "$95,000 / yr" or null
  }
}

Return ONLY the JSON object.`;

export async function analyzeCall(transcript: TranscriptLine[]): Promise<CallAnalysis> {
  const formatted = transcript
    .map((l) => `[${l.t.toFixed(1)}s] ${l.who}: ${l.text}`)
    .join("\n");

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: ANALYSIS_SYSTEM,
    messages: [{ role: "user", content: `Transcript:\n\n${formatted}` }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Claude occasionally wraps JSON in markdown fences or surrounds it with prose
  // despite the "Return ONLY the JSON" instruction. Strip fences and extract the
  // outermost JSON object before parsing so a stray line doesn't blow up the webhook.
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  const jsonSlice = first >= 0 && last > first ? stripped.slice(first, last + 1) : stripped;

  return JSON.parse(jsonSlice) as CallAnalysis;
}
