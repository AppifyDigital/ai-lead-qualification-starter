# Northline — AI Lead Qualification Demo

An end-to-end demo of an AI-powered lead intake + qualification flow. Built
for a YouTube video — every piece is inspectable in a single file, no
enterprise abstractions.

## The flow

```
┌──────────────────┐    1. submit        ┌───────────────────────┐
│  Landing page    │────────────────────▶│  POST /api/leads      │
│  (loan intake)   │                     │  └─▶ insert lead       │
└──────────────────┘                     │  └─▶ Vapi.createCall   │
                                         └──────────┬────────────┘
                                                    │ 2. outbound call
                                                    ▼
                                         ┌───────────────────────┐
                                         │  Vapi voice agent     │
                                         │  qualifies the lead   │
                                         └──────────┬────────────┘
                                                    │ 3. events (webhook)
                                                    ▼
┌───────────────────────────┐           ┌──────────────────────────────┐
│  Supabase Realtime        │◀──────────│  POST /api/vapi/webhook      │
│  (leads / calls /         │   writes  │  └─▶ save transcript          │
│   routing_decisions)      │           │  └─▶ Claude.analyzeCall       │
└──────────┬────────────────┘           │     (summary + extract JSON)  │
           │ 4. live updates            │  └─▶ trigger /assign           │
           ▼                            └──────────┬───────────────────┘
┌───────────────────────┐                          │
│  CRM dashboard        │                          ▼
│  /admin               │            ┌──────────────────────────────┐
│  /admin/lead/[id]     │            │  POST /api/leads/[id]/assign │
│  (auto-refresh on     │            │  └─▶ Claude.pickAssignee      │
│   realtime events)    │            │     (language / load / avail) │
└───────────────────────┘            │  └─▶ write routing_decision   │
                                     │  └─▶ update lead.assignee_id  │
                                     └──────────────────────────────┘
```

## Stack

- **Next.js 16** (App Router, `proxy.ts` for middleware) + React 19
- **Tailwind v4** + shadcn/ui
- **Supabase** — Postgres, Auth (magic link), Realtime
- **Vapi** — outbound voice agent
- **Anthropic Claude** (`claude-sonnet-4-5`) — transcript analysis + routing
- **Vercel** — deploy target

## Repository layout

```
src/
  app/
    page.tsx                          Landing + contact form
    login/page.tsx                    Magic-link login (guards /admin/*)
    auth/callback/route.ts            Exchanges the magic-link code
    admin/
      page.tsx                        Leads inbox
      lead/[id]/page.tsx              Lead detail + transcript + routing reasoning
      _components/realtime-leads.tsx  Subscribes to Supabase → router.refresh()
    api/
      leads/route.ts                  POST: create lead → trigger Vapi call
      leads/[id]/assign/route.ts      POST: Claude routing → update assignee
      vapi/webhook/route.ts           POST: call events → Claude analysis → auto-assign
  lib/
    supabase/browser.ts               Browser client (realtime subscriptions)
    supabase/server.ts                Server client + service-role admin client
    vapi.ts                           Outbound call creation
    claude.ts                         analyzeCall (summary + extracted JSON)
    routing.ts                        pickAssignee (Claude-powered)
    data.ts                           Typed read helpers used by the server components
  proxy.ts                            Protects /admin/*
supabase/migrations/
  0001_init.sql                       Tables, enums, realtime, RLS
  0002_seed_team.sql                  Three reps (Sofia ES, Daniel KO, Priya EN)
```

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a project at https://supabase.com.
2. Paste `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   and `SUPABASE_SECRET_KEY` into `.env.local`.
3. Run the migrations in the SQL editor **in order**:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed_team.sql`
4. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000`
   and add `http://localhost:3000/auth/callback` to **Redirect URLs**.
5. In **Database → Replication**, confirm `leads`, `calls`, and
   `routing_decisions` are in the `supabase_realtime` publication (the
   migration adds them; double-check the UI).

### 3. Anthropic

- Create a key at https://console.anthropic.com and paste into
  `ANTHROPIC_API_KEY`.

### 4. Vapi

1. Sign up at https://vapi.ai.
2. Create an **Assistant** with a system prompt like:

   > You are Ada, a loan qualification assistant for Northline Finance.
   > You are calling {{firstName}} who just requested ${{amount}}. In under
   > 90 seconds: confirm their name, preferred language, loan amount,
   > repayment period (36/48/60 months), employment status, and purpose.
   > Be warm and fast.

3. Buy/import a phone number and attach it to the assistant.
4. Paste the Assistant ID, Phone Number ID, and API key into `.env.local`.
5. Set the assistant's **Server URL** to `{APP_URL}/api/vapi/webhook`.

### 5. Local webhook (ngrok)

Vapi needs a public URL for the webhook:

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000
# copy the https URL → paste as APP_URL in .env.local and as
# the Vapi assistant's Server URL
```

### 6. Go

```bash
open http://localhost:3000
```

Submit the form with your own phone number. In a few seconds:

- Vapi will call you.
- After you hang up, the transcript appears in `/admin/lead/[id]`.
- Claude summarizes and routes the lead.
- The dashboard updates live.

## Environment

See `.env.example` for the full list. All keys are server-only except
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Things to configure in external dashboards

| Where              | What                                                       |
| ------------------ | ---------------------------------------------------------- |
| Supabase → Auth    | Site URL, redirect URL for `/auth/callback`                |
| Vapi → Assistant   | System prompt, attached phone number, Server URL           |
| Vercel (on deploy) | All env vars + set `APP_URL` to the production domain      |
