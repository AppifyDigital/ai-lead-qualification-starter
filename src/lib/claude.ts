import Anthropic from "@anthropic-ai/sdk";
import type {
  DocumentType,
  ExtractedCallData,
  ExtractedDocumentFields,
  TranscriptLine,
} from "@/types";

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

// Claude occasionally wraps JSON in markdown fences or surrounds it with prose
// despite a "return only JSON" instruction. Strip fences and extract the
// outermost JSON object before parsing.
function parseJsonFromResponse<T>(res: Anthropic.Message): T {
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1").trim();
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  const jsonSlice = first >= 0 && last > first ? stripped.slice(first, last + 1) : stripped;
  return JSON.parse(jsonSlice) as T;
}

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

  return parseJsonFromResponse<CallAnalysis>(res);
}

const DOCUMENT_SYSTEMS: Record<DocumentType, string> = {
  payslip: `You extract structured fields from a payslip / pay stub PDF.

Return JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "employer": string|null,
  "grossMonthly": number|null,        // gross pay normalized to a monthly figure (numeric, no currency symbol)
  "netMonthly": number|null,          // net / take-home normalized to a monthly figure
  "payPeriodStart": string|null,      // ISO date YYYY-MM-DD
  "payPeriodEnd": string|null,        // ISO date YYYY-MM-DD
  "employmentType": string|null,      // "full-time" | "part-time" | "contractor" | "self-employed" | other
  "currency": string|null             // ISO 4217 code, e.g. "USD", "EUR", "RSD"
}

If the pay period is weekly or biweekly, normalize the gross/net figures to monthly (multiply weekly by ~4.33, biweekly by ~2.17). Use null for any value you can't determine. Return ONLY the JSON object.`,

  id_document: `You extract structured fields from an ID document PDF (passport, national ID card, or driver's license).

Return JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "fullName": string|null,
  "dateOfBirth": string|null,         // ISO date YYYY-MM-DD
  "idDocumentType": string|null,      // "passport" | "national_id" | "drivers_license" | other
  "documentNumber": string|null,
  "expiryDate": string|null,          // ISO date YYYY-MM-DD
  "nationality": string|null          // ISO 3166-1 alpha-3 country code if available, else country name
}

Use null for any value not visible on the document. Return ONLY the JSON object.`,

  bank_statement: `You extract structured fields from a bank-statement PDF.

Return JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "accountHolder": string|null,
  "bankName": string|null,
  "periodStart": string|null,         // ISO date YYYY-MM-DD
  "periodEnd": string|null,           // ISO date YYYY-MM-DD
  "averageBalance": number|null,      // average daily / period balance (numeric, no currency symbol)
  "totalInflows": number|null,        // total deposits / credits over the period
  "totalOutflows": number|null,       // total withdrawals / debits over the period
  "currency": string|null             // ISO 4217 code
}

If the statement only shows opening and closing balances, set averageBalance to their mean. Use null for any value you can't determine. Return ONLY the JSON object.`,
};

export async function parseDocument(
  docType: DocumentType,
  pdfBase64: string,
): Promise<ExtractedDocumentFields> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 800,
    system: DOCUMENT_SYSTEMS[docType],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extract the fields as JSON. Use null for any value you cannot determine with confidence.",
          },
        ],
      },
    ],
  });

  return parseJsonFromResponse<ExtractedDocumentFields>(res);
}
