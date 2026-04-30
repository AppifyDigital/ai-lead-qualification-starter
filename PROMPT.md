# The prompt

This is the prompt I gave Claude Code to build this app from the `starter`
branch. Reproduced verbatim so you can adapt it for your own demo.

---

We're starting on the `starter` branch. The UI shell is already done — landing
page, admin dashboard, lead detail page, all rendering from mock JSON in
`src/data/`. Your job is to make it real: a lead submits the form → an AI voice
agent calls them back → the call is transcribed and analyzed by Claude → Claude
routes the lead to the best human rep → the CRM updates live.

I won't be running this with you, so optimize for clarity over hand-holding —
write the code as if it's going straight to production.

## Stack

- **Next.js 16** + React 19 + TypeScript + Tailwind 4 + shadcn/ui (already set up)
- **Supabase** — Postgres + Auth (magic link) + Realtime
- **Vapi** — outbound voice calls + webhook for call lifecycle
- **Claude** (Anthropic SDK, model `claude-sonnet-4-6`) — call analysis + lead routing
- **Zod** — request validation

### Important: this is Next.js 16 — read before coding

Some things are different from older Next.js:
- `middleware.ts` was renamed to **`proxy.ts`**, and the exported function is
  `proxy` (not `middleware`). Put it at `src/proxy.ts`.
- Route handler `params` is **always a Promise** — `{ params }: { params: Promise<{ id: string }> }`,
  and you `await params` inside.
- Use `@supabase/ssr` (`createServerClient` / `createBrowserClient`), not the
  legacy auth-helpers package.

If anything else in the docs surprises you, check `node_modules/next/dist/docs/`
before guessing. Don't suppress deprecation warnings.

## Environment (assume all set; just consume)

Create `.env.local` with these keys (I'll fill the values myself):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

ANTHROPIC_API_KEY=

VAPI_API_KEY=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
VAPI_WEBHOOK_SECRET=

APP_URL=http://localhost:3000
```

Vapi is already configured externally — assistant prompt walks the caller
through name → language → amount → term → employment → purpose, and the
assistant's Server URL points at `${APP_URL}/api/vapi/webhook`. Don't worry
about Twilio, geo permissions, or ngrok — that's all handled.

## Data model

Write `supabase/migrations/0001_init.sql` with:

- **`team_members`** — `id text pk`, `name`, `initials`, `role`, `email unique`,
  `languages language[]`, `active_leads int`, `status member_status`,
  `created_at`.
- **`leads`** — `id text pk` (default `'ld_' || substr(replace(gen_random_uuid()::text,'-',''),1,10)`),
  contact fields, `amount int`, `term_months int null`, `language`, `purpose`,
  `stage lead_stage default 'New'`, `score int default 0`,
  `assignee_id text references team_members on delete set null`,
  `received_at timestamptz default now()`, `is_new bool default true`.
- **`calls`** — `id uuid pk`, `lead_id text fk → leads on delete cascade`,
  `vapi_call_id text unique`, `status call_status default 'queued'`,
  `duration_sec int`, `language`, `transcript jsonb` (TranscriptLine[]),
  `summary text`, `summary_tail text`, `estimated_income text`,
  `extracted_data jsonb`, `started_at`, `ended_at`, `created_at`.
- **`routing_decisions`** — `id uuid pk`, `lead_id fk`, `assignee_id fk`,
  `reasoning text`, `created_at`. (Audit trail — keep all decisions, don't
  upsert.)

Enums: `lead_stage` (`New`/`Contacted`/`Qualified`/`In review`),
`language` (`English`/`Spanish`/`Korean`/`German`/`Mandarin`),
`member_status` (`available`/`on-call`/`away`/`offline`),
`call_status` (`queued`/`in-progress`/`completed`/`failed`).

Indexes on `leads(received_at desc)`, `leads(stage)`, `calls(lead_id)`,
`routing_decisions(lead_id, created_at desc)`.

Add all four tables to `supabase_realtime` publication. Enable RLS with
read-only `using (true)` policies for anon — writes are server-only via the
service role.

Write `supabase/migrations/0002_seed_team.sql` seeding three reps:
- `tm_sofia` Sofia Ramirez · English/Spanish · available · 7 active
- `tm_daniel` Daniel Cho · English/Korean · on-call · 12 active
- `tm_priya` Priya Natarajan · English · available · 9 active

(Three is enough that routing has a real choice — language tie-breaks against
Sofia, load tie-breaks against Daniel, Priya is the catch-all.)

Extend `src/types.ts` to add `ExtractedCallData` (`confirmedAmount`,
`repaymentPeriodMonths`, `employmentStatus`, `loanPurpose`,
`qualificationScore` 1–10, `recommendedNextAction`, `estimatedIncome`) and
`RoutingDecision` (`leadId`, `assigneeId`, `reasoning`, `createdAt`). Add
`extracted?: ExtractedCallData | null` to `LeadCall`.

## Auth

- `src/lib/supabase/server.ts`: export `supabaseServer()` (cookie-based, reads
  the user's session) and `supabaseAdmin()` (service role, server-only writes).
- `src/lib/supabase/browser.ts`: export `supabaseBrowser()` for realtime in
  client components.
- `src/proxy.ts`: guard `/admin/*`. If no user, redirect to `/login?next=<path>`.
  Matcher: `["/admin/:path*"]`.
- `src/app/login/page.tsx`: magic-link form (`signInWithOtp`, redirect to
  `/auth/callback`). Match the existing landing-page styling — same
  `bg-bg`/`text-ink`/`border-line` tokens, panel card, etc.
- `src/app/auth/callback/route.ts`: exchange the code for a session and
  redirect to `?next` (default `/admin`).

## Replace the mock data layer

`src/lib/data.ts` currently reads from `src/data/*.json`. Rewrite each
exported function (`getLeads`, `getLeadById`, `getTeam`, `getMemberById`,
`getLeadCall`) to query Supabase via `supabaseServer()`. Add
`getLatestRouting(leadId)` returning the most recent `routing_decisions` row.

DB columns are snake_case, the UI types are camelCase — map at the boundary
with small `toLead`/`toTeamMember` helpers. Keep row shapes typed narrowly so
schema drift surfaces as a TS error, not silently reshaped UI.

Once the new `data.ts` works, delete `src/data/*.json` and the imports.

## Lead intake — `POST /api/leads`

Wire the landing form to a real endpoint. The starter form just `setTimeout`s;
replace `handleSubmit` with a `fetch('/api/leads', { method: 'POST', ... })`
posting `{ name, email, phone, zip, amount, language: 'English' }`. Add an
error state under the submit button.

`src/app/api/leads/route.ts`:
1. Validate body with Zod (amount is positive int, language is the enum).
2. Insert into `leads` (stage `New`, `is_new true`), select the row back.
3. Call `createOutboundCall(lead)` (Vapi). Insert a `calls` row with the
   returned `vapi_call_id` and status `queued`.
4. If Vapi fails, **don't fail the lead insert** — log it, insert a `calls`
   row with status `failed` so the failure is visible in the CRM. A human can
   still call the lead manually.
5. Return `{ id }` with 201.

## Vapi outbound — `src/lib/vapi.ts`

`createOutboundCall(lead)` — POST `https://api.vapi.ai/call` with
`assistantId`, `phoneNumberId`, `customer: { number, name }`, and
`assistantOverrides.variableValues` (`name`, `firstName`, `amount`, `zip`,
`language`) so the assistant prompt can `{{interpolate}}` them. Throw on
non-2xx with the response body in the message.

## Vapi webhook — `POST /api/vapi/webhook`

`src/app/api/vapi/webhook/route.ts`. Vapi wraps everything under `message`,
and the field names drift between versions, so parse defensively (fall back
across `artifact.messages` → `messages`, `secondsFromStart` → `time`).

If `VAPI_WEBHOOK_SECRET` is set, verify the `x-vapi-signature` header.

Branch on `message.type`:
- **`call-started` / `status-update`** → update `calls` to `in-progress`,
  set `started_at`. Match by `vapi_call_id`.
- **`call-ended` / `hang`** → update `calls` to `completed`, set `ended_at`
  and `duration_sec`.
- **`end-of-call-report`** — the meaty one:
  1. Look up the `calls` row + its `lead_id` via `vapi_call_id`. If missing,
     ack and skip.
  2. Normalize the transcript to `TranscriptLine[]` (filter to `bot`/`assistant`/`user`,
     map `bot`/`assistant` → `agent`).
  3. **Save the transcript first**, before calling Claude. If analysis throws,
     we still want a visible trail in the CRM instead of a row stuck on
     `in-progress`.
  4. Call `analyzeCall(transcript)` → save `summary`, `summary_tail`,
     `estimated_income`, `extracted_data`. Update the lead: `stage = Qualified`,
     `score = clamp(qualificationScore × 10, 0, 100)`, plus `term_months` and
     `purpose` from the extraction.
  5. Trigger auto-assign: `fetch(\`${APP_URL}/api/leads/${leadId}/assign\`, { method: 'POST' })`.
     Await it inline — the demo is more legible when assignment lands before
     the next page render.

Other event types: ack with `{ ok: true, ignored: type }`. Always 200 unless
auth fails.

## Claude analysis — `src/lib/claude.ts`

`analyzeCall(transcript)` returns `{ summary, summaryTail, extracted }`.
Model: `claude-sonnet-4-6`. System prompt says: "Return JSON only, no prose,
no fences," with the exact schema (summary 2–3 sentences, summaryTail 1
sentence on tone/next step, extracted block per the type).

Defensive parse: strip ```json fences, then `slice(indexOf('{'), lastIndexOf('}')+1)`
before `JSON.parse`. Claude occasionally adds a stray sentence despite the
instruction — don't let it crash the webhook.

## Routing — `src/lib/routing.ts` + `POST /api/leads/[id]/assign`

`pickAssignee(lead, extracted, team)` calls Claude with the lead, the
extracted call data, and the team roster. System prompt orders the criteria:
**(1) language match, (2) availability — never pick `offline`, prefer
`available` over `on-call`, (3) lower active load as the tie-breaker**.
Returns `{ assigneeId, reasoning }`. Validate `assigneeId` is in the team
list — throw if Claude hallucinates one. The reasoning ships to the UI, so
prompt for plain-language sentences naming the language, status, and load.

`src/app/api/leads/[id]/assign/route.ts`:
1. Load the lead, the team, and the most recent completed call's
   `extracted_data` in parallel.
2. Call `pickAssignee`.
3. Insert into `routing_decisions` (kept as audit trail — never overwrite).
4. Update `leads.assignee_id` and set `is_new = false`.
5. Return the decision.

## Realtime — `src/app/admin/_components/realtime-leads.tsx`

Client component, mounts in both `/admin` and `/admin/lead/[id]`. Subscribe
to `postgres_changes` on `leads`, `calls`, `routing_decisions`. On change,
`router.refresh()`.

Two things to get right:
- **Coalesce bursts.** Vapi can fire several status-updates per second.
  Debounce refreshes to ~400ms so the server isn't re-rendering back-to-back.
- **Scope the subscription.** Pass `leadId` from the detail page and filter
  with `id=eq.${leadId}` on `leads` and `lead_id=eq.${leadId}` on the others.
  Otherwise every change for every lead refreshes every open tab.

Mount `<RealtimeLeads />` in `/admin/page.tsx` and `<RealtimeLeads leadId={lead.id} />`
in `/admin/lead/[id]/page.tsx`.

## Lead detail page — surface what's new

In `src/app/admin/lead/[id]/page.tsx`, add a "Claude · routing reasoning"
card under the assignee block, fed by `getLatestRouting(lead.id)`. Render
the reasoning as plain text so a manager can see *why* this rep got picked.
Leave the rest of the existing layout intact.

## Acceptance — the demo I want to run

1. Open `/`. Form is prefilled. Replace the phone with my real number,
   submit.
2. Phone rings within ~5 seconds. AI agent (Ada) greets me by first name,
   walks the script, hangs up after I confirm.
3. `/admin` updates live (no refresh): a new row appears, then its stage
   flips `New` → `Qualified` and the score lands.
4. Click into the lead. AI summary, transcript with timestamps, extracted
   facts (term, purpose, est. income), assignee with Claude's routing
   reasoning under it.
5. `/admin` is gated — incognito tab redirects to `/login`, magic link signs
   me in.

Build it in this order so each step is demoable on its own:
**migrations → data layer rewrite → auth → lead intake (form → DB) →
Vapi outbound (form → ringing phone) → webhook & Claude analysis (transcript
+ summary lands) → routing → realtime polish.**

Don't add features I didn't ask for. No notification toasts, no analytics,
no loading skeletons beyond what the starter has, no extra admin pages.
Match the existing visual language exactly — same tokens, same radii, same
mono treatment for IDs.
