import type { Lead } from "@/types";

// TODO: configure these in the Vapi dashboard:
//   - VAPI_ASSISTANT_ID       → Assistant with the loan qualification system prompt
//   - VAPI_PHONE_NUMBER_ID    → Outbound-capable phone number
//   - Assistant → Server URL  → {APP_URL}/api/vapi/webhook
//
// The assistant system prompt should walk the caller through:
//   confirm name → preferred language → loan amount → repayment period →
//   employment status → purpose. Keep it under 90 seconds.

const VAPI_BASE = "https://api.vapi.ai";

type VapiCall = {
  id: string;
  status: string;
};

export async function createOutboundCall(lead: Lead): Promise<VapiCall> {
  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId: process.env.VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: lead.phone,
        name: lead.name,
      },
      // Passed to the assistant as {{variable}} placeholders in its prompt.
      assistantOverrides: {
        variableValues: {
          name: lead.name,
          firstName: lead.name.split(" ")[0],
          amount: String(lead.amount),
          zip: lead.zip,
          language: lead.language,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Vapi createCall failed (${res.status}): ${detail}`);
  }

  return (await res.json()) as VapiCall;
}
